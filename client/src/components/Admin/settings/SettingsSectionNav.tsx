import SideNav from "components/common/SideNav";
import React from "react";
import { useTranslation } from "react-i18next";
import { useActiveSection } from "utils/useActiveSection";

import { SETTINGS_SECTIONS } from "./settingsForm";

const SettingsSectionNav: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { activeId } = useActiveSection(
    SETTINGS_SECTIONS.map((section) => section.id)
  );

  return (
    <SideNav
      ariaLabel={t("settingsSectionsNav")}
      topOffset="5rem"
      items={SETTINGS_SECTIONS.map((section) => ({
        key: section.id,
        label: t(section.labelKey),
        href: `#${section.id}`,
        isActive: section.id === activeId,
      }))}
    />
  );
};

export default SettingsSectionNav;
