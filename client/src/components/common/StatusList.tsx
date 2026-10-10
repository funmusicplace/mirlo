import React from "react";

export const StatusList: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ul className="m-0 list-none rounded-md border border-(--mi-tint-x-color) p-0">
    {children}
  </ul>
);

export const StatusListItem: React.FC<{
  children: React.ReactNode;
  alignStart?: boolean;
}> = ({ children, alignStart }) => (
  <li
    className={`flex ${alignStart ? "items-start" : "items-center"} justify-between gap-3 border-t border-(--mi-tint-x-color) px-4 py-3 first:border-t-0`}
  >
    {children}
  </li>
);
