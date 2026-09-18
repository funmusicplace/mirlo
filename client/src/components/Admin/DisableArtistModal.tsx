import Button from "components/common/Button";
import Modal from "components/common/Modal";
import TextArea from "components/common/TextArea";
import { useUpdateAdminArtistMutation } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";

const PREFILL_CONTENT_POLICY =
  "Your artist account has been disabled due to a violation of our Content Policy regarding AI-generated content: http://mirlo.space/pages/content-policy" +
  "\n\nThis determination was made after reviewing the artwork and/or music associated with your account. " +
  "\n\nIf you believe this decision was made in error, you can contest it by emailing support@mirlo.space with evidence supporting your appeal." +
  "\n\nWe recognize that for many in our community lean on AI tools because they don't have specific skills. We suggest joining our community or tagging us on socials, and we'll boost your post to connect you with people who might want to help.";

const DisableArtistModal: React.FC<{
  artistId: number;
  artistName?: string;
  open: boolean;
  onClose: () => void;
}> = ({ artistId, artistName, open, onClose }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const [disableReason, setDisableReason] = React.useState("");
  const { mutateAsync: updateArtist, isPending } =
    useUpdateAdminArtistMutation();

  React.useEffect(() => {
    if (open) {
      setDisableReason("");
    }
  }, [open]);

  const handleSubmitDisable = React.useCallback(async () => {
    if (!disableReason.trim()) {
      snackbar(t("disableReasonRequired"), { type: "warning" });
      return;
    }

    try {
      await updateArtist({
        artistId,
        enabled: false,
        disableReason: disableReason.trim(),
      });
      onClose();
      snackbar(t("artistDisableSuccess", { name: artistName }), {
        type: "success",
      });
    } catch (error) {
      snackbar(t("failedToDisableArtist"), { type: "warning" });
    }
  }, [artistId, artistName, disableReason, onClose, snackbar, t, updateArtist]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("disableArtistModal")}
      size="small"
    >
      <div className="flex flex-col gap-4">
        <p>{t("disableArtistDescription")}</p>

        <TextArea
          value={disableReason}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setDisableReason(e.target.value)
          }
          placeholder={t("disableReasonPlaceholder")}
          rows={6}
        />

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => setDisableReason(PREFILL_CONTENT_POLICY)}
            type="button"
          >
            {t("prefillContentPolicy")}
          </Button>
        </div>

        <div className="flex gap-2 justify-end">
          <Button onClick={onClose} type="button" disabled={isPending}>
            {t("cancelButton")}
          </Button>
          <Button
            onClick={handleSubmitDisable}
            type="button"
            disabled={isPending || !disableReason.trim()}
          >
            {isPending ? t("disablingArtist") : t("disableArtistButton")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DisableArtistModal;
