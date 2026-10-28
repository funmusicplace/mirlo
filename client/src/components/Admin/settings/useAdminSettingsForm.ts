import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryAdminSettings, querySetupStatus } from "queries/admin";
import { queryInstanceSettings } from "queries/instanceSettings";
import { queryFeaturedArtists, queryInstanceArtist } from "queries/settings";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useUpload } from "state/UploadContext";
import { DEFAULT_TRUST_LEVEL_NAMES } from "utils/trustLevel";

import {
  FormSettings,
  LOGO_FIELDS,
  SPLASH_IMAGE_JOB_KEY,
  formToSettingsPayload,
  settingsToForm,
} from "./settingsForm";

const SPLASH_IMAGE_ENDPOINT = "admin/settings/splash";

export const useAdminSettingsForm = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const { trackImageJob, untrackImageJob } = useUpload();
  const methods = useForm<FormSettings>();
  const { reset, setValue } = methods;
  const settingsQuery = useQuery(queryAdminSettings());
  const featuredArtistsQuery = useQuery(queryFeaturedArtists());
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [featuredArtistsOverride, setFeaturedArtistsOverride] = React.useState<
    Artist[] | undefined
  >(undefined);
  const featuredArtists =
    featuredArtistsOverride ?? featuredArtistsQuery.data ?? [];

  React.useEffect(() => {
    if (!isLoaded && settingsQuery.data && featuredArtistsQuery.data) {
      reset(settingsToForm(settingsQuery.data, DEFAULT_TRUST_LEVEL_NAMES));
      setIsLoaded(true);
    }
  }, [isLoaded, settingsQuery.data, featuredArtistsQuery.data, reset]);

  const saveSettings = React.useCallback(
    async (data: Partial<FormSettings>) => {
      const payload = formToSettingsPayload(
        data,
        featuredArtists.map((artist) => artist.id)
      );
      const response = await api.post<
        typeof payload,
        { result: Partial<SettingsFromAPI> }
      >("admin/settings", payload);
      const isSplashShown =
        data.instanceCustomization?.showHeroOnHome &&
        data.instanceCustomization?.showCustomSplash;
      const pendingSplashImage =
        data.pendingSplashImage === null || isSplashShown
          ? data.pendingSplashImage
          : undefined;
      try {
        for (const [kind, field] of Object.entries(LOGO_FIELDS)) {
          const pending = data[field.name];
          if (pending === undefined) {
            continue;
          }
          const endpoint = `admin/settings/logo/${kind}`;
          const { result } = pending
            ? await api.uploadFile<InstanceSettings>(endpoint, [pending])
            : await api.delete<{ result: InstanceSettings }>(endpoint);
          queryClient.setQueryData(queryInstanceSettings().queryKey, result);
          setValue(field.name, undefined);
        }
        if (pendingSplashImage) {
          const { result } = await api.uploadFile(SPLASH_IMAGE_ENDPOINT, [
            pendingSplashImage,
          ]);
          trackImageJob({
            key: SPLASH_IMAGE_JOB_KEY,
            jobId: result.jobId,
            file: pendingSplashImage,
            onComplete: () =>
              queryClient.invalidateQueries({
                queryKey: queryInstanceSettings().queryKey,
              }),
            onFailed: () =>
              snackbar(t("splashImageProcessingFailed"), { type: "warning" }),
          });
          setValue("pendingSplashImage", undefined);
        } else if (pendingSplashImage === null) {
          const { result } = await api.delete<{ result: InstanceSettings }>(
            SPLASH_IMAGE_ENDPOINT
          );
          untrackImageJob(SPLASH_IMAGE_JOB_KEY);
          queryClient.setQueryData(queryInstanceSettings().queryKey, result);
          setValue("pendingSplashImage", undefined);
        }
      } finally {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryInstanceSettings().queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: queryAdminSettings().queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: querySetupStatus().queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: queryInstanceArtist().queryKey,
          }),
        ]);
      }
      reset(settingsToForm(response.result, DEFAULT_TRUST_LEVEL_NAMES));
    },
    [
      featuredArtists,
      queryClient,
      reset,
      setValue,
      snackbar,
      t,
      trackImageJob,
      untrackImageJob,
    ]
  );

  return {
    methods,
    isLoaded,
    hasLoadError: settingsQuery.isError || featuredArtistsQuery.isError,
    featuredArtists,
    setFeaturedArtistsOverride,
    saveSettings,
  };
};

export default useAdminSettingsForm;
