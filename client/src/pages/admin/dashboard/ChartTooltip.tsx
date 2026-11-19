import { sumBy } from "lodash";
import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Lists each hovered series next to a swatch of its color. Recharts reports an
 * Area's stroke as its color, and ours is the surface-colored band separator,
 * so swatches come from `colors` (keyed by dataKey) instead.
 *
 * A stack is only readable if it also adds up the bands you're hovering.
 */
const ChartTooltip: React.FC<{
  active?: boolean;
  label?: string;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number;
    color?: string;
  }>;
  format: (value: number) => string;
  colors?: Record<string, string>;
  showTotal?: boolean;
}> = ({ active, label, payload, format, colors = {}, showTotal = true }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-(--mi-tint-x-color) bg-(--mi-background-color) px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-semibold">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-6">
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{
                backgroundColor: colors[String(entry.dataKey)] ?? entry.color,
              }}
            />
            {entry.name}
          </span>
          <span>{format(entry.value ?? 0)}</span>
        </div>
      ))}
      {showTotal && (
        <div className="mt-1 flex justify-between gap-6 border-t border-(--mi-tint-x-color) pt-1 font-semibold">
          <span>{t("total")}</span>
          <span>{format(sumBy(payload, (entry) => entry.value ?? 0))}</span>
        </div>
      )}
    </div>
  );
};

export default ChartTooltip;
