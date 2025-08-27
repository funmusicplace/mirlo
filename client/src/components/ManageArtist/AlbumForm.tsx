import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useTranslation } from "react-i18next";
import AlbumFormContent from "./ManageTrackGroup/AlbumFormComponents/AlbumFormContent";
import { TrackGroupFormData } from "./ManageTrackGroup/ManageTrackGroup";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import useErrorHandler from "services/useErrorHandler";
import { QUERY_KEY_TRACK_GROUPS } from "queries/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

const AlbumForm: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
  reload: () => void;
}> = ({ trackGroup, artist, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();

  const methods = useForm<TrackGroupFormData>();
  const { handleSubmit } = methods;
  const { user } = useAuthContext();
  const userId = user?.id;
  const client = useQueryClient();

  React.useEffect(() => {
    const defaultValues = {
      ...trackGroup,
      releaseDate: trackGroup?.releaseDate.split("T")[0],
      platformPercent: trackGroup?.platformPercent ?? 7,
      isGettable: trackGroup?.isGettable ?? true,
      minPrice: `${
        trackGroup?.minPrice !== undefined ? trackGroup.minPrice / 100 : ""
      }`,
      fundraisingGoal: `${
        trackGroup?.fundraisingGoal ? trackGroup.fundraisingGoal / 100 : ""
      }`,
      fundraisingEndDate: `${
        trackGroup?.fundraisingEndDate
          ? trackGroup.fundraisingEndDate.split("T")[0]
          : ""
      }`,
    };
    methods.reset(defaultValues);
  }, [trackGroup]);

  const artistId = artist?.id;
  const trackGroupId = trackGroup?.id;

  const doSave = React.useCallback(async () => {
    if (userId) {
      try {
        snackbar(t("trackGroupUpdated"), {
          type: "success",
        });
      } catch (e) {
        errorHandler(e);
      } finally {
        await reload();
      }
    }

    const timeout = setTimeout(() => {
      client.invalidateQueries({
        predicate: (query) => {
          const shouldInvalidate = query.queryKey.find((obj) => {
            if (typeof obj === "string") {
              return obj
                .toLowerCase()
                .includes(QUERY_KEY_TRACK_GROUPS.toLowerCase());
            }
            return false;
          });

          return !!shouldInvalidate;
        },
      });

      snackbar(t("merchUpdated"), {
        type: "success",
      });
    }, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, [t, userId, trackGroupId, snackbar, artistId, errorHandler, reload]);

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(doSave)}>
          <AlbumFormContent existingObject={trackGroup} reload={reload} />
        </form>
      </FormProvider>
    </div>
  );
};

export default AlbumForm;
