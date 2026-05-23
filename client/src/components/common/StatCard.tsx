import React from "react";

const StatCard: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="rounded-md border border-(--mi-tint-x-color) bg-(--mi-button-tint-color) p-4">
    <div className="text-xs uppercase tracking-wide text-(--mi-secondary-text-color)">
      {label}
    </div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
  </div>
);

export default StatCard;
