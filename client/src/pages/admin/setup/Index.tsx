import EmailProviderSection from "components/Admin/settings/EmailProviderSection";
import IdentitySettingsSection from "components/Admin/settings/IdentitySettingsSection";
import PlatformPolicySection from "components/Admin/settings/PlatformPolicySection";
import PoliciesSection from "components/Admin/settings/PoliciesSection";
import SecuritySection from "components/Admin/settings/SecuritySection";
import StripeSection from "components/Admin/settings/StripeSection";
import useAdminSettingsForm from "components/Admin/settings/useAdminSettingsForm";
import Box from "components/common/Box";
import Button from "components/common/Button";
import { SideNavLayout } from "components/common/SideNav";
import WidthContainer from "components/common/WidthContainer";
import {
  GUIDE_STEPS,
  GuideStepKey,
  isSavedStep,
  SUMMARY_STEPS,
} from "components/Setup/guide/guideSteps";
import SetupGuideNav from "components/Setup/guide/SetupGuideNav";
import SetupGuideProgress from "components/Setup/guide/SetupGuideProgress";
import { markSetupGuideSeen } from "components/Setup/guide/setupGuideSeen";
import SetupGuideStep from "components/Setup/guide/SetupGuideStep";
import SetupGuideSummary from "components/Setup/guide/SetupGuideSummary";
import useGuideStatuses from "components/Setup/guide/useGuideStatuses";
import useStepDrafts from "components/Setup/guide/useStepDrafts";
import SystemCheckStep from "components/Setup/status/SystemCheckStep";
import { useSetupStatusQuery } from "queries/admin";
import { useCompleteInstanceSetupMutation } from "queries/instanceSettings";
import React from "react";
import { FormProvider } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";

const DASHBOARD_PATH = "/admin/dashboard";

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
  const [activeKey, setActiveKey] = React.useState<GuideStepKey>("welcome");
  const { statuses, markSkipped } = useGuideStatuses(status);
  const [isSaving, setIsSaving] = React.useState(false);

  const { saveStep, discardStep, hasUnsavedChanges } = useStepDrafts(
    methods,
    saveSettings
  );

  React.useEffect(() => {
    if (hasLoadError) {
      snackbar(t("loadError"), { type: "warning" });
    }
  }, [hasLoadError, snackbar, t]);

  const activeIndex = GUIDE_STEPS.findIndex((step) => step.key === activeKey);
  const goTo = React.useCallback((index: number) => {
    const step = GUIDE_STEPS[index];
    if (step) {
      setActiveKey(step.key);
      window.scrollTo({ top: 0 });
    }
  }, []);

  const onSubmit = React.useCallback(async () => {
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
      await saveStep(activeKey);
      goTo(activeIndex + 1);
    } catch (e) {
      console.error(e);
      snackbar(t("saveError"), { type: "warning" });
    } finally {
      setIsSaving(false);
    }
  }, [
    activeIndex,
    activeKey,
    completeSetup,
    goTo,
    navigate,
    saveStep,
    snackbar,
    t,
  ]);

  const skipStep = () => {
    if (isSavedStep(activeKey)) {
      discardStep(activeKey);
    }
    markSkipped(activeKey);
    goTo(activeIndex + 1);
  };

  const finishLater = async () => {
    if (hasUnsavedChanges() && !(await ask(t("unsavedChangesConfirm")))) {
      return;
    }
    markSetupGuideSeen();
    navigate(DASHBOARD_PATH);
  };

  const stepKicker = t("stepOf", {
    current: activeIndex + 1,
    total: GUIDE_STEPS.length,
  });

  return (
    <WidthContainer variant="big" justify="center" className="px-4 pb-4 pt-6">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <SideNavLayout navWidth="16rem">
            <SetupGuideNav
              steps={GUIDE_STEPS}
              statuses={statuses}
              activeKey={activeKey}
              onSelect={(key) =>
                goTo(GUIDE_STEPS.findIndex((step) => step.key === key))
              }
            >
              <SetupGuideProgress
                current={activeIndex + 1}
                total={GUIDE_STEPS.length}
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
                <SetupGuideSummary steps={SUMMARY_STEPS} statuses={statuses} />
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

            {activeKey === "payments" && (
              <SetupGuideStep
                kicker={stepKicker}
                title={t("steps.payments")}
                description={t("payments.description")}
                onBack={() => goTo(activeIndex - 1)}
                onSkip={skipStep}
                isSaving={isSaving}
                canSubmit={isLoaded}
                submitLabel={t("saveAndContinue")}
              >
                <StripeSection hideTitle saveKey={() => saveStep("payments")} />
              </SetupGuideStep>
            )}

            {activeKey === "spamProtection" && (
              <SetupGuideStep
                kicker={stepKicker}
                title={t("steps.spamProtection")}
                description={t("spamProtection.description")}
                onBack={() => goTo(activeIndex - 1)}
                onSkip={skipStep}
                isSaving={isSaving}
                canSubmit={isLoaded}
                submitLabel={t("saveAndContinue")}
              >
                <SecuritySection hideTitle />
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
                <div className="flex flex-col gap-4">
                  {hasUnsavedChanges() && (
                    <Box variant="warning">{t("unsavedChanges")}</Box>
                  )}
                  <SetupGuideSummary
                    steps={SUMMARY_STEPS}
                    statuses={statuses}
                  />
                </div>
              </SetupGuideStep>
            )}
          </SideNavLayout>
        </form>
      </FormProvider>
    </WidthContainer>
  );
};

export default SetupGuide;
