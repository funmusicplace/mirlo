import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import { getArtistManageUrl } from "utils/artist";
import { useSnackbar } from "state/SnackbarContext";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";

const SaveDraftBar: React.FC<{
  reload: () => void;
}> = ({ reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { getValues } = useFormContext();
  const { artistId, trackGroupId } = useParams();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);

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
        artistId: Number(artistId),
      });
      reload();
      snackbar(t("draftSaved"), { type: "success" });
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap justify-between items-center mt-4 gap-2">
      <ArtistButton onClick={handleSaveDraft} isLoading={isSaving}>
        {t("saveAlbumDraft")}
      </ArtistButton>
      <ArtistButtonLink
        to={getArtistManageUrl(Number(artistId)) + "/releases/tools"}
        startIcon={<MdOutlineDownloadForOffline />}
        variant="outlined"
      >
        {t("downloadCodes")}
      </ArtistButtonLink>
    </div>
  );
};

export default SaveDraftBar;
