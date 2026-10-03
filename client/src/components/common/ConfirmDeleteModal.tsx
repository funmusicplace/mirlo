import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";

import Button from "./Button";
import { InputEl } from "./Input";
import Modal from "./Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  consequences: string[];
  confirmText: string;
  confirmLabel: string;
  isDeleting?: boolean;
};

const ConfirmDeleteModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  title,
  consequences,
  confirmText,
  confirmLabel,
  isDeleting,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "confirmDelete" });
  const [typed, setTyped] = React.useState("");
  const inputId = React.useId();

  React.useEffect(() => {
    if (!open) {
      setTyped("");
    }
  }, [open]);

  const matches = typed.trim() === confirmText.trim();

  return (
    <Modal open={open} onClose={onClose} size="small" title={title}>
      <p className="mb-2 font-bold">{t("cannotBeUndone")}</p>
      <ul className="mb-4 list-disc pl-6">
        {consequences.map((consequence) => (
          <li key={consequence} className="mb-1">
            {consequence}
          </li>
        ))}
      </ul>
      <label htmlFor={inputId} className="mb-2 block">
        {t("typeToConfirm", { text: confirmText })}
      </label>
      <InputEl
        id={inputId}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
      />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outlined" onClick={onClose} disabled={isDeleting}>
          {t("cancel")}
        </Button>
        <Button
          buttonRole="warning"
          startIcon={<FaTrash />}
          onClick={onConfirm}
          disabled={!matches || isDeleting}
          isLoading={isDeleting}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
