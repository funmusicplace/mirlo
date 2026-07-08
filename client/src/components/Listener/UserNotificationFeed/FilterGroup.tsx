import React from "react";

type Variant = "default" | "overlay";

const variantClasses = (variant: Variant, active: boolean): string => {
  if (variant === "overlay") {
    return active
      ? "bg-(--mi-button-color) border-(--mi-button-color) text-(--mi-button-text-color) font-semibold"
      : "border-white/25 text-white/85 hover:bg-white/10 hover:text-white";
  }
  return active
    ? "border-(--mi-button-color) bg-(--mi-button-tint-color) text-(--mi-button-color) font-semibold"
    : "border-(--mi-tint-x-color) text-(--mi-secondary-text-color) hover:text-(--mi-text-color) hover:border-(--mi-text-color)";
};

const FilterGroup: React.FC<{
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  variant?: Variant;
  noMargin?: boolean;
}> = ({
  legend,
  name,
  options,
  value,
  onChange,
  compact,
  variant = "default",
  noMargin = false,
}) => (
  <fieldset className={`border-none p-0 m-0 ${noMargin ? "" : "mb-4"}`}>
    <legend className="sr-only">{legend}</legend>
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <label key={opt.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only peer"
          />
          <span
            className={[
              "inline-block rounded-full border transition-colors select-none peer-focus-visible:ring-2 peer-focus-visible:ring-(--mi-button-color) peer-focus-visible:ring-offset-1",
              compact ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
              variantClasses(variant, value === opt.value),
            ].join(" ")}
          >
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

export default FilterGroup;
