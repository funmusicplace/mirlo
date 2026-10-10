import React from "react";

export type StatusChipVariant = "ok" | "warning" | "error" | "todo";

const VARIANT_CLASS_NAMES: Record<StatusChipVariant, string> = {
  ok: "text-[color-mix(in_srgb,var(--mi-success-background-color)_80%,var(--mi-text-color))] bg-[color-mix(in_srgb,var(--mi-success-background-color)_22%,var(--mi-background-color))] before:bg-(--mi-success-background-color)",
  warning:
    "text-[color-mix(in_srgb,var(--mi-warning-color)_80%,var(--mi-text-color))] bg-[color-mix(in_srgb,var(--mi-warning-color)_22%,var(--mi-background-color))] before:bg-(--mi-warning-color)",
  error:
    "text-[color-mix(in_srgb,var(--mi-pink)_80%,var(--mi-text-color))] bg-[color-mix(in_srgb,var(--mi-pink)_22%,var(--mi-background-color))] before:bg-(--mi-pink)",
  todo: "text-(--mi-text-color) bg-[color-mix(in_srgb,var(--mi-text-color)_10%,var(--mi-background-color))] before:bg-(--mi-text-color)",
};

const StatusChip: React.FC<{
  variant: StatusChipVariant;
  children: React.ReactNode;
}> = ({ variant, children }) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs leading-none font-semibold before:h-1.5 before:w-1.5 before:rounded-full before:content-[''] ${VARIANT_CLASS_NAMES[variant]}`}
  >
    {children}
  </span>
);

export default StatusChip;
