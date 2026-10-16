import { countChecks } from "components/Setup/status/SetupChecklist";
import { SetupStatus } from "queries/admin";
import React from "react";

import { GuideStepKey, SAVED_STEP_KEYS } from "./guideSteps";
import { SetupStepStatus } from "./SetupGuideNav";

export const useGuideStatuses = (status?: SetupStatus) => {
  const [statuses, setStatuses] = React.useState<
    Partial<Record<GuideStepKey, SetupStepStatus>>
  >({});

  React.useEffect(() => {
    if (status) {
      setStatuses((current) => {
        const next: Partial<Record<GuideStepKey, SetupStepStatus>> = {
          ...current,
          systemCheck:
            countChecks(status.checks, "error") === 0 ? "done" : "todo",
        };
        for (const key of SAVED_STEP_KEYS) {
          next[key] = status.steps[key]
            ? "done"
            : current[key] === "skipped"
              ? "skipped"
              : "todo";
        }
        return next;
      });
    }
  }, [status]);

  const markSkipped = React.useCallback((key: GuideStepKey) => {
    setStatuses((current) =>
      current[key] === "done" ? current : { ...current, [key]: "skipped" }
    );
  }, []);

  return { statuses, markSkipped };
};

export default useGuideStatuses;
