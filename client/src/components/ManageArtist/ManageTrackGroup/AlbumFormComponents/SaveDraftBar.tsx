import { ArtistButton } from "components/Artist/ArtistButtons";
import { TrackGroupFormData } from "pages/manage/artists/{artistId}/release/{trackGroupId}/Index";
import { useSaveAlbumFormMutation } from "queries/trackGroups";
import React from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { isTrackGroupPublished } from "utils/artist";

const SaveDraftBar: React.FC<{
  existingObject: TrackGroup;
  onSaveSuccess?: () => void;
}> = ({ existingObject, onSaveSuccess }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { isDirty, dirtyFields } = useFormState<TrackGroupFormData>();
  const { getValues, reset } = useFormContext<TrackGroupFormData>();
  const { artistId } = useParams();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const saveMutation = useSaveAlbumFormMutation();

  if (isTrackGroupPublished(existingObject)) {
    return null;
  }

  const handleSaveDraft = async () => {
    const values = getValues();
    try {
      const response = await saveMutation.mutateAsync({
        formData: values,
        trackGroupId: existingObject.id,
        artistId: Number(artistId),
        fundraiserId: existingObject.fundraiser?.id,
        dirtyFields,
      });
      reset({
        ...values,
        urlSlug: response[0].result.urlSlug ?? values.urlSlug,
      });
      onSaveSuccess?.();
      snackbar(t("draftSaved"), { type: "success" });
    } catch (e) {
      errorHandler(e);
    }
  };

  return (
    <ArtistButton
      type="button"
      onClick={handleSaveDraft}
      isLoading={saveMutation.isPending}
      disabled={saveMutation.isPending || !isDirty}
      variant="outlined"
    >
      {t("saveAlbumDraft")}
    </ArtistButton>
  );
};

export default SaveDraftBar;
