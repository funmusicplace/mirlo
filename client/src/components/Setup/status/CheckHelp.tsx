import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";

const CheckHelp: React.FC<{
  id: string;
  label: string;
  detail: string;
  text: React.ReactNode;
}> = ({ id, label, detail, text }) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup.checks" });
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="min-w-0">
      <span className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        <Button
          type="button"
          variant="outlined"
          size="tiny"
          onlyIcon
          aria-expanded={isOpen}
          aria-controls={id}
          aria-label={t("helpToggle")}
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-full! text-xs font-bold opacity-60 hover:opacity-100"
        >
          ?
        </Button>
      </span>
      <span className="mt-0.5 block text-sm opacity-70">{detail}</span>
      <small id={id} hidden={!isOpen} className="mt-1 block opacity-80">
        {text}
      </small>
    </div>
  );
};

export default CheckHelp;
