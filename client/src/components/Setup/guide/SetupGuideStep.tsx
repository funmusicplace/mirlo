import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";

const SetupGuideStep: React.FC<{
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
  onBack?: () => void;
  onSkip?: () => void;
  isSaving?: boolean;
  canSubmit?: boolean;
  submitLabel: string;
}> = ({
  kicker,
  title,
  description,
  children,
  onBack,
  onSkip,
  isSaving,
  canSubmit = true,
  submitLabel,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });

  return (
    <section className="max-w-2xl">
      <header className="mb-6 border-b border-(--mi-tint-x-color) pb-3">
        <p className="m-0 text-xs uppercase tracking-widest opacity-60">
          {kicker}
        </p>
        <h1 className="mt-1! mb-2! text-2xl! leading-snug! font-bold!">
          {title}
        </h1>
        <p className="m-0 opacity-80">{description}</p>
      </header>

      {children}

      <div className="sticky bottom-0 mt-8 flex items-center gap-3 border-t border-(--mi-tint-x-color) bg-(--mi-background-color) py-4">
        {onBack && (
          <Button type="button" variant="outlined" onClick={onBack}>
            {t("back")}
          </Button>
        )}
        {onSkip && (
          <Button type="button" variant="transparent" onClick={onSkip}>
            {t("skipForNow")}
          </Button>
        )}
        <Button
          type="submit"
          uppercase
          className="ml-auto"
          isLoading={isSaving}
          disabled={isSaving || !canSubmit}
        >
          {submitLabel}
        </Button>
      </div>
    </section>
  );
};

export default SetupGuideStep;
