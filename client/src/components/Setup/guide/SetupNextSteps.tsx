import { StatusList, StatusListItem } from "components/common/StatusList";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const MAINTENANCE_GUIDE_URL = "https://docs.mirlo.space/hosting/maintenance";

const NEXT_STEPS = [
  { key: "instanceArtist", to: "/admin/settings" },
  { key: "inviteArtists", to: "/admin/content/invites" },
  { key: "maintenanceGuide", href: MAINTENANCE_GUIDE_URL },
] as const;

const SetupNextSteps: React.FC<{ onLeave: (path: string) => void }> = ({
  onLeave,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup.done" });

  return (
    <section
      aria-labelledby="setup-next-steps-title"
      className="flex flex-col gap-2"
    >
      <h3 id="setup-next-steps-title" className="text-base font-bold">
        {t("nextStepsTitle")}
      </h3>
      <StatusList>
        {NEXT_STEPS.map((step) => (
          <StatusListItem key={step.key} alignStart>
            <span className="flex flex-col">
              {"to" in step ? (
                <Link
                  to={step.to}
                  className="font-medium underline"
                  onClick={(event) => {
                    event.preventDefault();
                    onLeave(step.to);
                  }}
                >
                  {t(step.key)}
                </Link>
              ) : (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                >
                  {t(step.key)}
                </a>
              )}
              <small className="opacity-70">
                {t(`${step.key}Description`)}
              </small>
            </span>
          </StatusListItem>
        ))}
      </StatusList>
    </section>
  );
};

export default SetupNextSteps;
