import Button from "components/common/Button";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDownload, FaRegCopy } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

const RecoveryCodesModal: React.FC<{
  codes: string[] | null;
  onClose: () => void;
}> = ({ codes, onClose }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const snackbar = useSnackbar();
  const text = (codes ?? []).join("\n");

  const onCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(text);
    snackbar(t("copied"), { type: "success" });
  }, [text, snackbar, t]);

  const onDownload = React.useCallback(() => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }, [text]);

  return (
    <Modal
      open={!!codes}
      onClose={onClose}
      size="small"
      title={t("recoveryCodesTitle")}
    >
      <p className="mb-4">{t("recoveryCodesIntro")}</p>
      <ul className="grid grid-cols-2 gap-2 font-mono mb-4">
        {codes?.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" startIcon={<FaRegCopy />} onClick={onCopy}>
          {t("copyCodes")}
        </Button>
        <Button type="button" startIcon={<FaDownload />} onClick={onDownload}>
          {t("downloadCodes")}
        </Button>
        <Button type="button" buttonRole="primary" onClick={onClose}>
          {t("savedCodes")}
        </Button>
      </div>
    </Modal>
  );
};

export default RecoveryCodesModal;
