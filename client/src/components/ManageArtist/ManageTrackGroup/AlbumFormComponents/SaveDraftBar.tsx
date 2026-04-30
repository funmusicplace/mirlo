import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { isTrackGroupPublished } from "utils/artist";

const SaveDraftBar: React.FC<{
  existingObject: TrackGroup;
  reload: () => Promise<unknown>;
}> = ({ existingObject, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { getValues } = useFormContext();
  const { artistId, trackGroupId } = useParams();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);

  const isPublished = isTrackGroupPublished(existingObject);

  if (isPublished) {
    return null;
  }

  const handleSaveDraft = async () => {
    if (!trackGroupId || !artistId) return;
    setIsSaving(true);
    try {
      const values = getValues();
      await api.put(`manage/trackGroups/${trackGroupId}`, {
        title: values.title,
        about: values.about,
        credits: values.credits,
        releaseDate: values.releaseDate
          ? new Date(values.releaseDate).toISOString()
          : null,
        publishedAt: values.publishedAt
          ? new Date(values.publishedAt).toISOString()
          : null,
        minPrice: values.minPrice ? Number(values.minPrice) * 100 : null,
        suggestedPrice: values.suggestedPrice
          ? Number(values.suggestedPrice) * 100
          : null,
        catalogNumber: values.catalogNumber,
        urlSlug: values.urlSlug,
        isPublic: values.isPublic,
        artistId: Number(artistId),
      });
      await reload();
      snackbar(t("draftSaved"), { type: "success" });
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ArtistButton
      onClick={handleSaveDraft}
      isLoading={isSaving}
      variant="outlined"
    >
      {t("saveAlbumDraft")}
    </ArtistButton>
  );
};

export default SaveDraftBar;
