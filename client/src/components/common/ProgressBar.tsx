import React from "react";

const ProgressBar: React.FC<{
  label: string;
  value: number;
  max: number;
  min?: number;
  className?: string;
}> = ({ label, value, max, min = 0, className = "" }) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    className={`h-1.5 overflow-hidden rounded-(--mi-border-radius) border border-(--mi-tint-x-color) bg-(--mi-tint-color) ${className}`}
  >
    <div
      className="h-full bg-(--mi-button-color)"
      style={{ width: `${max > 0 ? Math.round((value / max) * 100) : 0}%` }}
    />
  </div>
);

export default ProgressBar;
