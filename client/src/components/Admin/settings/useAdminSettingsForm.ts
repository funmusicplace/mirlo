import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryAdminSettings } from "queries/admin";
import { queryInstanceSettings } from "queries/instanceSettings";
import { queryFeaturedArtists } from "queries/settings";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import { DEFAULT_TRUST_LEVEL_NAMES } from "utils/trustLevel";

import {
  FormSettings,
  formToSettingsPayload,
  settingsToForm,
} from "./settingsForm";

export const useAdminSettingsForm = () => {
  const queryClient = useQueryClient();
  const methods = useForm<FormSettings>();
  const { reset } = methods;
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
      reset(settingsToForm(response.result, DEFAULT_TRUST_LEVEL_NAMES));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryInstanceSettings().queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: queryAdminSettings().queryKey,
        }),
      ]);
    },
    [featuredArtists, queryClient, reset]
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
