import React from "react";
import { useTranslation } from "react-i18next";

import type {
  SetupGuideStepDefinition,
  SetupStepStatus,
} from "./SetupGuideNav";

const STATUS_CLASS_NAMES: Record<SetupStepStatus, string> = {
  done: "bg-(--mi-green-100) text-(--mi-green-700)",
  skipped: "bg-(--mi-red-100) text-(--mi-red-700)",
  todo: "bg-(--mi-tint-color) text-(--mi-text-color)",
};

const SetupGuideSummary: React.FC<{
  steps: readonly SetupGuideStepDefinition[];
  statuses: Record<string, SetupStepStatus>;
}> = ({ steps, statuses }) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });

  return (
    <ul className="m-0 list-none rounded-md border border-(--mi-tint-x-color) p-0">
      {steps.map((step) => {
        const status = statuses[step.key] ?? "todo";
        return (
          <li
            key={step.key}
            className="flex items-center justify-between gap-3 border-t border-(--mi-tint-x-color) px-4 py-3 first:border-t-0"
          >
            <span className="font-medium">{t(step.labelKey)}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS_NAMES[status]}`}
            >
              {t(`status.${status}`)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default SetupGuideSummary;
