import React from "react";

const ChartContainer: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="mb-8 p-4 rounded-md border border-(--mi-tint-x-color) bg-(--mi-background-color)">
    <h4 className="mb-4 font-semibold">{title}</h4>
    {children}
  </div>
);

export default ChartContainer;
