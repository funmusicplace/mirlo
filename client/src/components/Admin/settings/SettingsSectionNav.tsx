import styled from "@emotion/styled";
import React from "react";
import { useTranslation } from "react-i18next";

import { bp } from "../../../constants";

import { SETTINGS_SECTIONS } from "./settingsForm";

const Nav = styled.nav`
  position: sticky;
  top: calc(var(--header-cover-sticky-height) + 5rem);
  align-self: start;

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  a {
    display: block;
    padding: 0.375rem 0.625rem;
    border-left: 3px solid transparent;
    color: var(--mi-normal-foreground-color);
    text-decoration: none;
    opacity: 0.75;

    &:hover,
    &.active {
      opacity: 1;
      background: var(--mi-darken-background-color);
    }

    &.active {
      border-left-color: var(--mi-button-color);
      font-weight: 600;
    }
  }

  @media screen and (max-width: ${bp.medium}px) {
    position: static;

    ol {
      flex-direction: row;
      overflow-x: auto;
      scrollbar-width: none;
      border-bottom: 1px solid var(--mi-tint-x-color);
    }

    a {
      white-space: nowrap;
      border-left: 0;
      border-bottom: 3px solid transparent;

      &.active {
        background: none;
        border-bottom-color: var(--mi-button-color);
      }
    }
  }
`;

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
    <Nav aria-label={t("settingsSectionsNav")}>
      <ol>
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={section.id === activeId ? "active" : undefined}
              aria-current={section.id === activeId ? "location" : undefined}
            >
              {t(section.labelKey)}
            </a>
          </li>
        ))}
      </ol>
    </Nav>
  );
};

export default SettingsSectionNav;
