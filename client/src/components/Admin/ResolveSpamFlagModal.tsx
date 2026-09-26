import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";

const ResolveSpamFlagModal: React.FC<{
  open: boolean;
  accountName: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (resetSpamStrikes: boolean) => void;
}> = ({ open, accountName, isPending, onClose, onConfirm }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "flaggedContent",
  });
  const [resetSpamStrikes, setResetSpamStrikes] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setResetSpamStrikes(false);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("resolveSpamFlagTitle")}
      size="small"
    >
      <div className="flex flex-col gap-4">
        <FormComponent direction="row">
          <InputEl
            id="input-resolve-reset-spam-strikes"
            type="checkbox"
            checked={resetSpamStrikes}
            onChange={(e) => setResetSpamStrikes(e.target.checked)}
            aria-describedby="hint-resolve-reset-spam-strikes"
          />
          <div className="flex flex-col">
            <label htmlFor="input-resolve-reset-spam-strikes">
              {t("resolveAndResetStrikes", { name: accountName })}
            </label>
            <small id="hint-resolve-reset-spam-strikes">
              {t("resolveAndResetStrikesHint")}
            </small>
          </div>
        </FormComponent>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outlined" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            disabled={isPending}
            onClick={() => onConfirm(resetSpamStrikes)}
          >
            {t("resolveFlag")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ResolveSpamFlagModal;
