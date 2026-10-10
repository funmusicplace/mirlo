import { ButtonLink } from "components/common/Button";
import ProgressBar from "components/common/ProgressBar";
import StatusChip from "components/common/StatusChip";
import { useSetupStatusQuery } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";

import SetupChecklist, { countChecks } from "./SetupChecklist";

const SetupStatusCard: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "setup.card" });
  const { data: status } = useSetupStatusQuery();

  if (!status) {
    return null;
  }

  const steps = Object.entries(status.steps);
  const doneSteps = steps.filter(([, done]) => done).length;
  const undoneSteps = steps.filter(([, done]) => !done);
  const problems = countChecks(status.checks, "error");
  const itemsLeft = undoneSteps.length + problems;

  if (itemsLeft === 0) {
    return null;
  }

  return (
    <section className="mb-8 rounded-md border border-(--mi-tint-x-color) bg-(--mi-tint-color) p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="m-0! grow text-lg! font-semibold!">{t("title")}</h3>
        <StatusChip variant="warning">
          {t("itemsLeft", { count: itemsLeft })}
        </StatusChip>
        <ButtonLink to="/admin/setup" variant="outlined" size="compact">
          {t("resumeGuide")}
        </ButtonLink>
      </div>
      <ProgressBar
        label={t("progress", { done: doneSteps, total: steps.length })}
        value={doneSteps}
        max={steps.length}
        className="mb-4 bg-(--mi-background-color)"
      />
      {undoneSteps.length > 0 && (
        <ul className="mb-4 flex list-none flex-wrap gap-2 p-0">
          {undoneSteps.map(([key]) => (
            <li key={key}>
              <StatusChip variant="todo">{t(`steps.${key}`)}</StatusChip>
            </li>
          ))}
        </ul>
      )}
      {problems > 0 && <SetupChecklist checks={status.checks} onlyErrors />}
    </section>
  );
};

export default SetupStatusCard;
