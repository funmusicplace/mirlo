import React from "react";
import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";

import Button from "./Button";

const ReloadPrompt: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "common" });

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.error("Service worker registration error", error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="alert"
      className="w-full flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-(--mi-warning-background-color) text-(--mi-warning-text-color) text-sm"
    >
      <span>{t("newVersionAvailable")}</span>
      <Button
        size="compact"
        onClick={() => updateServiceWorker(true)}
      >
        {t("reload")}
      </Button>
      <Button
        size="compact"
        variant="outlined"
        onClick={() => setNeedRefresh(false)}
      >
        {t("dismiss")}
      </Button>
    </div>
  );
};

export default ReloadPrompt;
