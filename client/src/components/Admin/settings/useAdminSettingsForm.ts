import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryAdminSettings, querySetupStatus } from "queries/admin";
import { queryInstanceSettings } from "queries/instanceSettings";
import { queryFeaturedArtists, queryInstanceArtist } from "queries/settings";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import { DEFAULT_TRUST_LEVEL_NAMES } from "utils/trustLevel";

import {
  FormSettings,
  LOGO_FIELDS,
  formToSettingsPayload,
  settingsToForm,
} from "./settingsForm";

export const useAdminSettingsForm = () => {
  const queryClient = useQueryClient();
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
    [featuredArtists, queryClient, reset, setValue]
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
