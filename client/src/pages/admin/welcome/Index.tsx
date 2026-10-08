import SetupHeading from "components/Setup/SetupHeading";
import SetupLogin from "components/Setup/SetupLogin";
import SetupSteps from "components/Setup/SetupSteps";
import { useInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

const Welcome: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });
  const { setupStage } = useInstanceSettings();
  const { user } = useAuthContext();

  React.useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  if (setupStage !== "welcome") {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-(--mi-background-color) px-4 py-12">
      {user === null && <SetupLogin />}
      {user && !user.isAdmin && (
        <div className="w-full max-w-[30rem]">
          <SetupHeading lead={t("notAdminLead")} />
        </div>
      )}
      {user?.isAdmin && <SetupSteps />}
    </main>
  );
};

export default Welcome;
