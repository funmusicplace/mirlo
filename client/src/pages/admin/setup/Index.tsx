import EmailProviderSection from "components/Admin/settings/EmailProviderSection";
import IdentitySettingsSection from "components/Admin/settings/IdentitySettingsSection";
import PlatformPolicySection from "components/Admin/settings/PlatformPolicySection";
import PoliciesSection from "components/Admin/settings/PoliciesSection";
import { FormSettings } from "components/Admin/settings/settingsForm";
import useAdminSettingsForm from "components/Admin/settings/useAdminSettingsForm";
import Box from "components/common/Box";
import Button from "components/common/Button";
import { SideNavLayout } from "components/common/SideNav";
import WidthContainer from "components/common/WidthContainer";
import SetupGuideNav, {
  SetupStepStatus,
} from "components/Setup/guide/SetupGuideNav";
import SetupGuideProgress from "components/Setup/guide/SetupGuideProgress";
import { markSetupGuideSeen } from "components/Setup/guide/setupGuideSeen";
import SetupGuideStep from "components/Setup/guide/SetupGuideStep";
import SetupGuideSummary from "components/Setup/guide/SetupGuideSummary";
import { countChecks } from "components/Setup/status/SetupChecklist";
import SystemCheckStep from "components/Setup/status/SystemCheckStep";
import { useSetupStatusQuery } from "queries/admin";
import { useCompleteInstanceSetupMutation } from "queries/instanceSettings";
import React from "react";
import { FormProvider } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";

const STEPS = [
  { key: "welcome", labelKey: "steps.welcome" },
  { key: "systemCheck", labelKey: "steps.systemCheck" },
  { key: "identity", labelKey: "steps.identity" },
  { key: "email", labelKey: "steps.email" },
  { key: "platformPolicy", labelKey: "steps.platformPolicy" },
  { key: "done", labelKey: "steps.done" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const SETTING_STEPS = STEPS.slice(1, -1);

const DASHBOARD_PATH = "/admin/dashboard";

const SAVED_STEP_KEYS = ["identity", "email", "platformPolicy"] as const;

type SavedStepKey = (typeof SAVED_STEP_KEYS)[number];

const STEP_FIELDS: Record<SavedStepKey, (keyof FormSettings)[]> = {
  identity: ["instanceCustomization"],
  email: ["emailProvider"],
  platformPolicy: [
    "platformPercent",
    "isClosedToPublicArtistSignup",
    "terms",
    "privacyPolicy",
    "cookiePolicy",
    "contentPolicy",
  ],
};

const isSavedStep = (key: StepKey): key is SavedStepKey =>
  (SAVED_STEP_KEYS as readonly string[]).includes(key);

const SetupGuide: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { ask } = useConfirm();
  const { methods, isLoaded, hasLoadError, saveSettings } =
    useAdminSettingsForm();
  const { mutateAsync: completeSetup, isPending: isCompleting } =
    useCompleteInstanceSetupMutation();
  const {
    data: status,
    isError: hasStatusError,
    isFetching: isCheckingSystem,
    refetch: rerunChecks,
  } = useSetupStatusQuery();
  const [activeKey, setActiveKey] = React.useState<StepKey>("welcome");
  const [statuses, setStatuses] = React.useState<
    Partial<Record<StepKey, SetupStepStatus>>
  >({});
  const [isSaving, setIsSaving] = React.useState(false);

  const { isDirty } = methods.formState;

  React.useEffect(() => {
    if (status) {
      setStatuses((current) => {
        const next: Partial<Record<StepKey, SetupStepStatus>> = {
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

  React.useEffect(() => {
    if (hasLoadError) {
      snackbar(t("loadError"), { type: "warning" });
    }
  }, [hasLoadError, snackbar, t]);

  const activeIndex = STEPS.findIndex((step) => step.key === activeKey);
  const goTo = React.useCallback((index: number) => {
    const step = STEPS[index];
    if (step) {
      setActiveKey(step.key);
      window.scrollTo({ top: 0 });
    }
  }, []);

  const onSubmit = React.useCallback(
    async (data: FormSettings) => {
      if (activeKey === "welcome" || activeKey === "systemCheck") {
        goTo(activeIndex + 1);
        return;
      }
      if (activeKey === "done") {
        try {
          await completeSetup();
          navigate(DASHBOARD_PATH);
        } catch (e) {
          console.error(e);
          snackbar(t("completeError"), { type: "warning" });
        }
        return;
      }
      setIsSaving(true);
      try {
        await saveSettings(data);
        goTo(activeIndex + 1);
      } catch (e) {
        console.error(e);
        snackbar(t("saveError"), { type: "warning" });
      } finally {
        setIsSaving(false);
      }
    },
    [
      activeIndex,
      activeKey,
      completeSetup,
      goTo,
      navigate,
      saveSettings,
      snackbar,
      t,
    ]
  );

  const skipStep = () => {
    if (isSavedStep(activeKey)) {
      const defaults = methods.formState.defaultValues ?? {};
      methods.reset(
        {
          ...methods.getValues(),
          ...Object.fromEntries(
            STEP_FIELDS[activeKey].map((field) => [field, defaults[field]])
          ),
        },
        { keepDefaultValues: true }
      );
    }
    setStatuses((current) =>
      current[activeKey] === "done"
        ? current
        : { ...current, [activeKey]: "skipped" }
    );
    goTo(activeIndex + 1);
  };

  const finishLater = async () => {
    if (isDirty && !(await ask(t("unsavedChangesConfirm")))) {
      return;
    }
    markSetupGuideSeen();
    navigate(DASHBOARD_PATH);
  };

  const stepKicker = t("stepOf", {
    current: activeIndex + 1,
    total: STEPS.length,
  });

  return (
    <WidthContainer variant="big" justify="center" className="px-4 pb-4 pt-6">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <SideNavLayout navWidth="16rem">
            <SetupGuideNav
              steps={STEPS}
              statuses={statuses}
              activeKey={activeKey}
              onSelect={(key) =>
                goTo(STEPS.findIndex((step) => step.key === key))
              }
            >
              <SetupGuideProgress
                current={activeIndex + 1}
                total={STEPS.length}
              />
              <Button type="button" variant="link" onClick={finishLater}>
                {t("finishLater")}
              </Button>
            </SetupGuideNav>

            {activeKey === "welcome" && (
              <SetupGuideStep
                kicker={t("steps.welcome")}
                title={t("welcome.title")}
                description={t("welcome.description")}
                submitLabel={t("start")}
              >
                <SetupGuideSummary steps={SETTING_STEPS} statuses={statuses} />
              </SetupGuideStep>
            )}

            {activeKey === "systemCheck" && (
              <SetupGuideStep
                kicker={stepKicker}
                title={t("steps.systemCheck")}
                description={t("systemCheck.description")}
                onBack={() => goTo(activeIndex - 1)}
                submitLabel={t("continue")}
              >
                <SystemCheckStep
                  status={status}
                  hasError={hasStatusError}
                  isChecking={isCheckingSystem}
                  onRerun={() => rerunChecks()}
                />
              </SetupGuideStep>
            )}

            {activeKey === "identity" && (
              <SetupGuideStep
                kicker={stepKicker}
                title={t("steps.identity")}
                description={t("identity.description")}
                onBack={() => goTo(activeIndex - 1)}
                onSkip={skipStep}
                isSaving={isSaving}
                canSubmit={isLoaded}
                submitLabel={t("saveAndContinue")}
              >
                <IdentitySettingsSection hideTitle />
              </SetupGuideStep>
            )}

            {activeKey === "email" && (
              <SetupGuideStep
                kicker={stepKicker}
                title={t("steps.email")}
                description={t("email.description")}
                onBack={() => goTo(activeIndex - 1)}
                onSkip={skipStep}
                isSaving={isSaving}
                canSubmit={isLoaded}
                submitLabel={t("saveAndContinue")}
              >
                <EmailProviderSection hideTitle />
              </SetupGuideStep>
            )}

            {activeKey === "platformPolicy" && (
              <SetupGuideStep
                kicker={stepKicker}
                title={t("steps.platformPolicy")}
                description={t("platformPolicy.description")}
                onBack={() => goTo(activeIndex - 1)}
                onSkip={skipStep}
                isSaving={isSaving}
                canSubmit={isLoaded}
                submitLabel={t("saveAndContinue")}
              >
                <PlatformPolicySection hideTitle hideInvitesLink />
                <PoliciesSection />
              </SetupGuideStep>
            )}

            {activeKey === "done" && (
              <SetupGuideStep
                kicker={stepKicker}
                title={t("done.title")}
                description={t("done.description")}
                onBack={() => goTo(activeIndex - 1)}
                isSaving={isCompleting}
                canSubmit={isLoaded}
                submitLabel={t("goToDashboard")}
              >
                {isDirty && <Box variant="warning">{t("unsavedChanges")}</Box>}
                <SetupGuideSummary steps={SETTING_STEPS} statuses={statuses} />
              </SetupGuideStep>
            )}
          </SideNavLayout>
        </form>
      </FormProvider>
    </WidthContainer>
  );
};

export default SetupGuide;
