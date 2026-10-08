import SideNav from "components/common/SideNav";
import React from "react";
import { useTranslation } from "react-i18next";

import { SETTINGS_SECTIONS } from "./settingsForm";

const SettingsSectionNav: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const [activeId, setActiveId] = React.useState<string>(
    SETTINGS_SECTIONS[0].id
  );

  React.useEffect(() => {
    const sections = SETTINGS_SECTIONS.map((section) =>
      document.getElementById(section.id)
    ).filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-25% 0px -60% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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
