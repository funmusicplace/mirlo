import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { useCancelArtistSubscriberMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

const CancelSupporterButton: React.FC<{
  artistId: number;
  subscriptionId: number;
  supporterName: string;
}> = ({ artistId, subscriptionId, supporterName }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "artistSupporters",
  });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isOpen, setIsOpen] = React.useState(false);
  const { mutateAsync, isPending } = useCancelArtistSubscriberMutation();

  const onConfirm = async () => {
    try {
      await mutateAsync({ artistId, subscriptionId });
      snackbar(t("supporterCancelled"), { type: "success" });
      setIsOpen(false);
    } catch (e) {
      errorHandler(e);
    }
  };

  return (
    <>
      <Button size="compact" variant="link" onClick={() => setIsOpen(true)}>
        {t("cancelSupporter")}
      </Button>
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("cancelSupporterTitle")}
        size="small"
      >
        <div className="flex flex-col gap-3">
          <p>{t("cancelSupporterConfirm", { name: supporterName })}</p>
          <Button
            size="compact"
            buttonRole="warning"
            isLoading={isPending}
            onClick={onConfirm}
          >
            {t("cancelSupporterSubmit")}
          </Button>
          <Button
            size="compact"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            {t("nevermind")}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default CancelSupporterButton;
