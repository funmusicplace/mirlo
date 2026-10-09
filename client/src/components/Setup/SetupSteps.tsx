import useAdminSettingsForm from "components/Admin/settings/useAdminSettingsForm";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { useInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isLight } from "utils/colors";
import { applyInstanceStyles } from "utils/instanceSettings";

import AccentColorPicker from "./AccentColorPicker";
import SetupHeading, { SETUP_LEAD_ID } from "./SetupHeading";
import SetupInput from "./SetupInput";
import SetupPreview from "./SetupPreview";

type SetupForm = {
  name: string;
  supportEmail: string;
};

const STEPS = [
  { kickerKey: "firstStep", leadKey: "nameLead" },
  { kickerKey: "secondStep", leadKey: "contactLead" },
  { kickerKey: "lastStep", leadKey: "colorLead" },
] as const;

const buttonTextFor = (button: string) =>
  isLight(button) ? "#000000" : "#ffffff";

const SetupSteps: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });
  const instanceSettings = useInstanceSettings();
  const { register, handleSubmit, watch, setFocus } = useForm<SetupForm>({
    defaultValues: { name: "", supportEmail: "" },
  });
  const [stepIndex, setStepIndex] = React.useState(0);
  const [accent, setAccent] = React.useState(instanceSettings.colors.button);
  const settingsForm = useAdminSettingsForm();
  const [isPending, setIsPending] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const accentSwatchRef = React.useRef<HTMLButtonElement>(null);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const name = watch("name").trim();

  React.useEffect(() => {
    if (stepIndex === 0) {
      setFocus("name");
    } else if (stepIndex === 1) {
      setFocus("supportEmail");
    } else {
      accentSwatchRef.current?.focus();
    }
  }, [stepIndex, setFocus]);

  const chooseAccent = React.useCallback(
    (button: string) => {
      applyInstanceStyles({
        ...instanceSettings,
        colors: {
          ...instanceSettings.colors,
          button,
          buttonText: buttonTextFor(button),
        },
      });
      setAccent(button);
    },
    [instanceSettings]
  );

  const onSubmit = React.useCallback(
    async (data: SetupForm) => {
      if (!isLastStep) {
        setStepIndex((index) => index + 1);
        return;
      }
      const settings = settingsForm.methods.getValues();
      const customization = settings.instanceCustomization ?? {};
      const supportEmail = data.supportEmail.trim();
      setIsPending(true);
      setIsError(false);
      try {
        await settingsForm.saveSettings({
          ...settings,
          instanceCustomization: {
            ...customization,
            title: data.name.trim(),
            ...(supportEmail && { supportEmail }),
            colors: {
              ...customization.colors,
              button: accent,
              buttonText: buttonTextFor(accent),
            },
          },
        });
        window.location.assign("/admin/setup");
      } catch (e) {
        console.error(e);
        setIsError(true);
        setIsPending(false);
      }
    },
    [accent, isLastStep, settingsForm]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[30rem]">
      <div className="mb-10 flex gap-1.5" aria-hidden="true">
        {STEPS.map(({ kickerKey }, index) => (
          <span
            key={kickerKey}
            className={`h-2 w-2 rounded-full ${
              index <= stepIndex
                ? "bg-(--mi-button-color)"
                : "bg-(--mi-tint-x-color)"
            }`}
          />
        ))}
      </div>
      <SetupHeading kicker={t(step.kickerKey)} lead={t(step.leadKey)} />

      {stepIndex === 0 && (
        <FormComponent>
          <label htmlFor="input-instance-name">{t("nameLabel")}</label>
          <SetupInput
            id="input-instance-name"
            type="text"
            required
            maxLength={60}
            placeholder={t("namePlaceholder")}
            aria-describedby="hint-instance-name"
            {...register("name", {
              required: true,
              validate: (value) => value.trim() !== "",
            })}
          />
          <small id="hint-instance-name">{t("nameHint")}</small>
        </FormComponent>
      )}

      {stepIndex === 1 && (
        <FormComponent>
          <label htmlFor="input-contact-email">{t("contactLabel")}</label>
          <SetupInput
            id="input-contact-email"
            type="email"
            placeholder={t("contactPlaceholder")}
            {...register("supportEmail")}
          />
        </FormComponent>
      )}

      {stepIndex === 2 && (
        <AccentColorPicker
          ref={accentSwatchRef}
          value={accent}
          onChange={chooseAccent}
          labelledBy={SETUP_LEAD_ID}
        />
      )}

      {stepIndex !== 1 && <SetupPreview name={name} />}

      {isError && (
        <p role="alert" className="mt-6 text-(--mi-warning-color)">
          {t("saveError")}
        </p>
      )}
      {settingsForm.hasLoadError && (
        <p role="alert" className="mt-6 text-(--mi-warning-color)">
          {t("loadError")}
        </p>
      )}

      <div className="mt-8 flex items-center gap-3">
        {stepIndex > 0 && (
          <Button
            type="button"
            variant="link"
            onClick={() => setStepIndex((index) => index - 1)}
          >
            {t("back")}
          </Button>
        )}
        <Button
          type="submit"
          size="big"
          uppercase
          className="ml-auto"
          isLoading={isPending}
          disabled={isPending || (isLastStep && !settingsForm.isLoaded)}
        >
          {isLastStep ? t("openMyPlatform") : t("continue")}
        </Button>
      </div>
    </form>
  );
};

export default SetupSteps;
