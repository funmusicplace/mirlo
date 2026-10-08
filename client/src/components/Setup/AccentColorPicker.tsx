import FormComponent from "components/common/FormComponent";
import { InputEl, colorInputClass } from "components/common/Input";
import React from "react";
import { useTranslation } from "react-i18next";

const ACCENT_SWATCHES = [
  { color: "#be3455", labelKey: "colorPink" },
  { color: "#5c899c", labelKey: "colorBlue" },
  { color: "#44633f", labelKey: "colorGreen" },
  { color: "#eda100", labelKey: "colorYellow" },
  { color: "#231f24", labelKey: "colorBlack" },
  { color: "#6e3fa3", labelKey: "colorPurple" },
] as const;

const AccentColorPicker = React.forwardRef<
  HTMLButtonElement,
  {
    value: string;
    onChange: (color: string) => void;
    labelledBy: string;
  }
>(({ value, onChange, labelledBy }, selectedSwatchRef) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });
  const selectedColor = ACCENT_SWATCHES.some(({ color }) => color === value)
    ? value
    : ACCENT_SWATCHES[0].color;

  return (
    <>
      <div
        role="group"
        aria-labelledby={labelledBy}
        className="mb-3 flex flex-wrap gap-2"
      >
        {ACCENT_SWATCHES.map(({ color, labelKey }) => (
          <button
            key={color}
            ref={color === selectedColor ? selectedSwatchRef : undefined}
            type="button"
            aria-label={t(labelKey)}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className={`h-10 w-10 cursor-pointer rounded-full border-2 ${
              value === color
                ? "border-(--mi-text-color)"
                : "border-(--mi-background-color)"
            }`}
          />
        ))}
      </div>
      <FormComponent direction="row">
        <label htmlFor="input-accent-color">{t("colorCustom")}</label>
        <InputEl
          id="input-accent-color"
          type="color"
          className={`${colorInputClass} max-w-14`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </FormComponent>
    </>
  );
});

AccentColorPicker.displayName = "AccentColorPicker";

export default AccentColorPicker;
