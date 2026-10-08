import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryInstanceSettings } from "queries/instanceSettings";
import { queryFeaturedArtists } from "queries/settings";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import { DEFAULT_TRUST_LEVEL_NAMES } from "utils/trustLevel";

import {
  FormSettings,
  SettingsFromAPI,
  formToSettingsPayload,
  settingsToForm,
} from "./settingsForm";

export const useAdminSettingsForm = () => {
  const queryClient = useQueryClient();
  const methods = useForm<FormSettings>();
  const { reset } = methods;
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasLoadError, setHasLoadError] = React.useState(false);
  const { data: initialFeaturedArtists } = useQuery(queryFeaturedArtists());
  const [featuredArtistsOverride, setFeaturedArtistsOverride] = React.useState<
    Artist[] | undefined
  >(undefined);
  const featuredArtists =
    featuredArtistsOverride ?? initialFeaturedArtists ?? [];

  React.useEffect(() => {
    const load = async () => {
      const response =
        await api.get<Partial<SettingsFromAPI>>("admin/settings/");
      reset(settingsToForm(response.result, DEFAULT_TRUST_LEVEL_NAMES));
      setIsLoaded(true);
    };
    load().catch((e) => {
      console.error(e);
      setHasLoadError(true);
    });
  }, [reset]);

  const saveSettings = React.useCallback(
    async (data: Partial<FormSettings>) => {
      await api.post(
        "admin/settings",
        formToSettingsPayload(
          data,
          featuredArtists.map((artist) => artist.id)
        )
      );
      await queryClient.invalidateQueries({
        queryKey: queryInstanceSettings().queryKey,
      });
    },
    [featuredArtists, queryClient]
  );

  return {
    methods,
    isLoaded,
    hasLoadError,
    featuredArtists,
    setFeaturedArtistsOverride,
    saveSettings,
  };
};

export default useAdminSettingsForm;
