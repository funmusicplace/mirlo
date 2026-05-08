import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";
import { useFormState } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { isTrackGroupPublished } from "utils/artist";

import { TrackGroupFormData } from "../ManageTrackGroup";

import { useSaveTrackGroupForm } from "./saveTrackGroupForm";

const SaveDraftBar: React.FC<{
  existingObject: TrackGroup;
  reload: () => Promise<unknown>;
  onSaveSuccess?: () => void;
}> = ({ existingObject, reload, onSaveSuccess }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { isDirty } = useFormState<TrackGroupFormData>();
  const { artistId } = useParams();
  const snackbar = useSnackbar();
  const [isSaving, setIsSaving] = React.useState(false);

  const save = useSaveTrackGroupForm(existingObject, Number(artistId), reload);

  const isPublished = isTrackGroupPublished(existingObject);

  if (isPublished) {
    return null;
  }

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await save();
      onSaveSuccess?.();
      snackbar(t("draftSaved"), { type: "success" });
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ArtistButton
      type="button"
      onClick={handleSaveDraft}
      isLoading={isSaving}
      disabled={isSaving || !isDirty}
      variant="outlined"
    >
      {t("saveAlbumDraft")}
    </ArtistButton>
  );
};

export default SaveDraftBar;
