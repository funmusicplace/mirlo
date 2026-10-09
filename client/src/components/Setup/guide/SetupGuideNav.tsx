import SideNav from "components/common/SideNav";
import React from "react";
import { useTranslation } from "react-i18next";

export type SetupStepStatus = "todo" | "done" | "skipped";

export type SetupGuideStepDefinition<K extends string = string> = {
  key: K;
  labelKey: string;
};

const StepState: React.FC<{ status: SetupStepStatus }> = ({ status }) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });

  if (status === "done") {
    return (
      <span
        role="img"
        className="ml-auto text-sm font-bold text-(--mi-success-background-color)"
        aria-label={t("stepDone")}
      >
        ✓
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="ml-auto text-xs font-normal opacity-70">
        {t("stepSkipped")}
      </span>
    );
  }
  return null;
};

const SetupGuideNav = <K extends string>({
  steps,
  statuses,
  activeKey,
  onSelect,
  children,
}: {
  steps: readonly SetupGuideStepDefinition<K>[];
  statuses: Partial<Record<K, SetupStepStatus>>;
  activeKey: K;
  onSelect: (key: K) => void;
  children?: React.ReactNode;
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });

  return (
    <SideNav
      ariaLabel={t("guideNavLabel")}
      heading={t("guideNavHeading")}
      ariaCurrentValue="step"
      items={steps.map((step) => ({
        key: step.key,
        label: t(step.labelKey),
        isActive: step.key === activeKey,
        onClick: () => onSelect(step.key),
        trailing: <StepState status={statuses[step.key] ?? "todo"} />,
      }))}
    >
      {children}
    </SideNav>
  );
};

export default SetupGuideNav;
