import Button from "components/common/Button";
import { useInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { safeSessionStorage } from "utils/safeStorage";

const SETUP_BANNER_DISMISSED_KEY = "mirlo-setup-banner-dismissed";

const SETUP_GUIDE_PATH = "/admin/setup";

const SetupBanner: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "setup.banner" });
  const { user } = useAuthContext();
  const { setupStage } = useInstanceSettings();
  const { pathname } = useLocation();
  const [isDismissed, setIsDismissed] = React.useState(
    () => safeSessionStorage.read(SETUP_BANNER_DISMISSED_KEY) === "true"
  );

  if (
    setupStage === "done" ||
    !user?.isAdmin ||
    isDismissed ||
    pathname.startsWith(SETUP_GUIDE_PATH)
  ) {
    return null;
  }

  const dismiss = () => {
    setIsDismissed(true);
    safeSessionStorage.write(SETUP_BANNER_DISMISSED_KEY, "true");
  };

  return (
    <div
      role="status"
      className="flex w-full flex-wrap items-center justify-center gap-3 bg-(--mi-warning-background-color) px-4 py-2 text-sm text-(--mi-warning-text-color)"
    >
      <strong>{t("title")}</strong>
      <Link
        to={SETUP_GUIDE_PATH}
        className="font-semibold text-inherit! underline"
      >
        {t("resume")}
      </Link>
      <Button
        type="button"
        variant="link"
        className="text-inherit! opacity-80 hover:opacity-100"
        onClick={dismiss}
      >
        {t("dismiss")}
      </Button>
    </div>
  );
};

export default SetupBanner;
