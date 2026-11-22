import Button from "components/common/Button";
import { SecurityKey, useRemoveSecurityKeyMutation } from "queries/mfa";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import { useConfirm } from "utils/useConfirm";

import { useMfaErrorHandler } from "./useMfaErrorHandler";

const SecurityKeysList: React.FC<{ securityKeys: SecurityKey[] }> = ({
  securityKeys,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "adminSecurity",
  });
  const { ask } = useConfirm();
  const onError = useMfaErrorHandler();
  const { mutateAsync: removeKey } = useRemoveSecurityKeyMutation();

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(i18n.language);

  const onRemove = async (key: SecurityKey) => {
    if (!(await ask(t("confirmRemoveKey", { name: key.name })))) {
      return;
    }
    try {
      await removeKey(key.id);
    } catch (e) {
      onError(e);
    }
  };

  if (securityKeys.length === 0) {
    return <p>{t("noSecurityKeys")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {securityKeys.map((key) => (
        <li
          key={key.id}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-(--mi-tint-x-color) pb-2"
        >
          <div className="flex flex-col">
            <strong>{key.name}</strong>
            <small>
              {t("added", { date: formatDate(key.createdAt) })}
              {" · "}
              {key.lastUsedAt
                ? t("lastUsed", { date: formatDate(key.lastUsedAt) })
                : t("neverUsed")}
            </small>
          </div>
          <Button
            type="button"
            size="compact"
            variant="outlined"
            startIcon={<FaTrash />}
            onClick={() => onRemove(key)}
          >
            {t("remove")}
          </Button>
        </li>
      ))}
    </ul>
  );
};

export default SecurityKeysList;
