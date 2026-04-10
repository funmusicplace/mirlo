import React from "react";

const FilterGroup: React.FC<{
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}> = ({ legend, name, options, value, onChange, compact }) => (
  <fieldset className="border-none p-0 m-0 mb-4">
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
              "inline-block rounded-full border transition-colors select-none peer-focus-visible:ring-2 peer-focus-visible:ring-(--mi-primary-color) peer-focus-visible:ring-offset-1",
              compact ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
              value === opt.value
                ? "border-(--mi-primary-color) text-(--mi-primary-color) font-semibold"
                : "border-(--mi-darken-x-background-color) text-(--mi-light-foreground-color) hover:text-(--mi-normal-foreground-color) hover:border-(--mi-normal-foreground-color)",
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
