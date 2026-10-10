import StatusChip from "components/common/StatusChip";
import { StatusList, StatusListItem } from "components/common/StatusList";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";
import { SetupStatus, SetupCheckStatus } from "queries/admin";
import React from "react";
import { Trans, useTranslation } from "react-i18next";

import CheckHelp from "./CheckHelp";

type CheckKey = keyof SetupStatus["checks"];

const PROGRAM_LINKS: Partial<Record<CheckKey, Record<string, string>>> = {
  database: { postgresLink: "https://www.postgresql.org/" },
  redis: { redisLink: "https://redis.io/" },
  storage: {
    garageLink: "https://garagehq.deuxfleurs.fr/",
    backblazeLink: "https://www.backblaze.com/cloud-storage",
  },
};

const ProgramLink: React.FC<{ href: string; children?: React.ReactNode }> = ({
  href,
  children,
}) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline">
    {children}
  </a>
);

const CHECK_ORDER: CheckKey[] = [
  "database",
  "redis",
  "worker",
  "scheduledTasks",
  "publicAddress",
  "storage",
];

export const countChecks = (
  checks: SetupStatus["checks"],
  status: SetupCheckStatus
) => CHECK_ORDER.filter((key) => checks[key].status === status).length;

const SetupChecklist: React.FC<{
  checks: SetupStatus["checks"];
  onlyErrors?: boolean;
}> = ({ checks, onlyErrors }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "setup.checks",
  });

  const detailFor = (key: CheckKey): string => {
    const check = checks[key];
    switch (key) {
      case "database":
        return check.status === "ok"
          ? t("database.ok", { count: checks.database.migrations ?? 0 })
          : t("database.error");
      case "redis":
        return t(`redis.${check.status === "ok" ? "ok" : "error"}`);
      case "worker":
        return t(`worker.${check.status === "ok" ? "ok" : "error"}`);
      case "scheduledTasks": {
        const { enabled, tasks } = checks.scheduledTasks;
        if (!enabled) {
          return t("scheduledTasks.disabled");
        }
        const lastRun = tasks
          .map((task) => task.lastCompletedAt)
          .filter((date): date is string => Boolean(date))
          .sort()
          .at(-1);
        if (check.status === "error") {
          return t("scheduledTasks.error");
        }
        return lastRun
          ? t("scheduledTasks.ok", {
              when: formatRelativeTime({ date: lastRun, i18n }),
            })
          : t("scheduledTasks.neverRan");
      }
      case "publicAddress": {
        const { apiDomainConfigured, clientRegistered } = checks.publicAddress;
        if (apiDomainConfigured && clientRegistered) {
          return t("publicAddress.ok");
        }
        return apiDomainConfigured
          ? t("publicAddress.noClient")
          : t("publicAddress.noDomain");
      }
      case "storage": {
        const { backend, missingBuckets } = checks.storage;
        const backendName = t(`storage.backend.${backend}`);
        return missingBuckets === 0
          ? t("storage.ok", { backend: backendName })
          : t("storage.missing", {
              backend: backendName,
              count: missingBuckets,
            });
      }
    }
  };

  const keys = onlyErrors
    ? CHECK_ORDER.filter((key) => checks[key].status === "error")
    : CHECK_ORDER;

  return (
    <StatusList>
      {keys.map((key) => (
        <StatusListItem key={key} alignStart>
          <CheckHelp
            id={`check-help-${key}`}
            label={t(`${key}.label`)}
            detail={detailFor(key)}
            text={
              <Trans
                t={t}
                i18nKey={`${key}.help`}
                components={Object.fromEntries(
                  Object.entries(PROGRAM_LINKS[key] ?? {}).map(
                    ([name, href]) => [name, <ProgramLink href={href} />]
                  )
                )}
              />
            }
          />
          <StatusChip variant={checks[key].status}>
            {t(`status.${checks[key].status}`)}
          </StatusChip>
        </StatusListItem>
      ))}
    </StatusList>
  );
};

export default SetupChecklist;
