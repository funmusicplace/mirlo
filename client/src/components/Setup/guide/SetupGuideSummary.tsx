import StatusChip, { StatusChipVariant } from "components/common/StatusChip";
import { StatusList, StatusListItem } from "components/common/StatusList";
import React from "react";
import { useTranslation } from "react-i18next";

import type {
  SetupGuideStepDefinition,
  SetupStepStatus,
} from "./SetupGuideNav";

const CHIP_VARIANTS: Record<SetupStepStatus, StatusChipVariant> = {
  done: "ok",
  skipped: "error",
  todo: "todo",
};

const SetupGuideSummary: React.FC<{
  steps: readonly SetupGuideStepDefinition[];
  statuses: Record<string, SetupStepStatus>;
}> = ({ steps, statuses }) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });

  return (
    <StatusList>
      {steps.map((step) => {
        const status = statuses[step.key] ?? "todo";
        return (
          <StatusListItem key={step.key}>
            <span className="font-medium">{t(step.labelKey)}</span>
            <StatusChip variant={CHIP_VARIANTS[status]}>
              {t(`status.${status}`)}
            </StatusChip>
          </StatusListItem>
        );
      })}
    </StatusList>
  );
};

export default SetupGuideSummary;
