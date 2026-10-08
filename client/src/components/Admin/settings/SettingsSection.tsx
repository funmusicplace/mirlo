import React from "react";

import { SETTINGS_SECTIONS } from "./settingsForm";

const SettingsSection: React.FC<{
  id: (typeof SETTINGS_SECTIONS)[number]["id"];
  title: string;
  hideTitle?: boolean;
  children: React.ReactNode;
}> = ({ id, title, hideTitle, children }) => (
  <fieldset id={id} className="mb-8 scroll-mt-32">
    <legend
      className={
        hideTitle
          ? "sr-only"
          : "mb-4 w-full border-b border-(--mi-tint-x-color) pb-2 text-lg font-semibold"
      }
    >
      {title}
    </legend>
    {children}
  </fieldset>
);

export default SettingsSection;
