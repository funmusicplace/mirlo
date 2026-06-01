import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import { useUpdateArtistMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen, FaSave, FaTimes } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

interface ArtistFormLabelProps {
  artist: Pick<Artist, "id" | "artistLabels">;
}

const ArtistFormLabel: React.FC<ArtistFormLabelProps> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const { mutateAsync: updateArtist, isPending } = useUpdateArtistMutation();

  const approvedLabels = React.useMemo(
    () =>
      (artist.artistLabels ?? []).filter(
        (al) => al.isArtistApproved && al.isLabelApproved
      ),
    [artist.artistLabels]
  );

  const currentDisplayedLabelUserId = React.useMemo(
    () =>
      approvedLabels.find((al) => al.isDisplayedOnArtistPage)?.labelUserId ??
      null,
    [approvedLabels]
  );

  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedLabelUserId, setSelectedLabelUserId] = React.useState<
    number | null
  >(currentDisplayedLabelUserId);

  if (approvedLabels.length === 0 || !user) {
    return null;
  }

  const handleOpen = () => {
    setSelectedLabelUserId(currentDisplayedLabelUserId);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateArtist({
        userId: user.id,
        artistId: artist.id,
        body: { displayLabelUserId: selectedLabelUserId },
      });
      snackbar(t("labelUpdated"), { type: "success" });
      setIsEditing(false);
    } catch {
      snackbar(t("failedToUpdateLabel"), { type: "warning" });
    }
  };

  const hasLabel = currentDisplayedLabelUserId !== null;

  return (
    <>
      <ArtistButton
        variant="dashed"
        size="compact"
        smallIcon
        onClick={handleOpen}
        startIcon={<FaPen />}
        className="shrink-0 max-md:hidden!"
      >
        {hasLabel ? t("editLabel") : t("addLabel")}
      </ArtistButton>
      <Modal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title={t("chooseLabel")}
        size="small"
      >
        <div
          role="radiogroup"
          aria-label={t("chooseLabel")}
          className="flex flex-col gap-2 mt-2"
        >
          <label
            htmlFor="input-display-label-none"
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              id="input-display-label-none"
              type="radio"
              name="displayLabelUserId"
              checked={selectedLabelUserId === null}
              onChange={() => setSelectedLabelUserId(null)}
            />
            <span>{t("noLabelDisplayed")}</span>
          </label>
          {approvedLabels.map((al) => {
            const labelArtist = al.labelUser.artists?.[0];
            const labelName = labelArtist?.name ?? al.labelUser.name;
            const inputId = `input-display-label-${al.labelUserId}`;
            return (
              <label
                key={al.labelUserId}
                htmlFor={inputId}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  id={inputId}
                  type="radio"
                  name="displayLabelUserId"
                  checked={selectedLabelUserId === al.labelUserId}
                  onChange={() => setSelectedLabelUserId(al.labelUserId)}
                />
                <span>{labelName}</span>
              </label>
            );
          })}
        </div>
        <div className="flex gap-1 mt-4 justify-end">
          <ArtistButton
            size="compact"
            startIcon={<FaTimes />}
            variant="outlined"
            onClick={() => setIsEditing(false)}
          >
            {t("cancel")}
          </ArtistButton>
          <ArtistButton
            size="compact"
            startIcon={<FaSave />}
            onClick={handleSave}
            isLoading={isPending}
          >
            {t("saveLabel")}
          </ArtistButton>
        </div>
      </Modal>
    </>
  );
};

export default ArtistFormLabel;
