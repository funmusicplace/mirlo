import React from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import Button from "../common/Button";

import { useTranslation } from "react-i18next";
import AlbumFormContent from "./AlbumFormComponents/AlbumFormContent";
import { TrackGroupFormData } from "./ManageTrackGroup";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import useErrorHandler from "services/useErrorHandler";

const AlbumForm: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
  reload: () => void;
}> = ({ trackGroup, artist, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);

  const methods = useForm<TrackGroupFormData>();
  const { handleSubmit } = methods;
  const { user } = useAuthContext();
  const userId = user?.id;

  React.useEffect(() => {
    const defaultValues = {
      ...trackGroup,
      releaseDate: trackGroup?.releaseDate.split("T")[0],
      minPrice: `${
        trackGroup?.minPrice !== undefined ? trackGroup.minPrice / 100 : ""
      }`,
    };
    methods.reset(defaultValues);
  }, [trackGroup]);

  const artistId = artist?.id;
  const trackGroupId = trackGroup?.id;

  const doSave = React.useCallback(async () => {
    if (userId) {
      try {
        setIsSaving(true);

        snackbar(t("trackGroupUpdated"), {
          type: "success",
        });
      } catch (e) {
        errorHandler(e);
      } finally {
        setIsSaving(false);
        await reload();
      }
    }
  }, [t, userId, trackGroupId, snackbar, artistId, errorHandler, reload]);
  const isDisabled = isSaving;

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(doSave)}>
          <AlbumFormContent existingObject={trackGroup} />

          <Button
            variant="big"
            type="submit"
            disabled={isDisabled}
            isLoading={isDisabled}
          >
            {trackGroup.published ? t("update") : t("saveDraft")}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
};

export default AlbumForm;
