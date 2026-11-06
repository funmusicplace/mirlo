import styled from "@emotion/styled";
import React from "react";
import { useTranslation } from "react-i18next";

const SectionAnchorLink = styled.a<{ inColumn?: boolean }>`
  && {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 0.5rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--mi-light-foreground-color);
    ${(props) =>
      props.inColumn
        ? `
    padding: 0.25rem clamp(0.375rem, 2cqi, 0.625rem);
    font-size: clamp(0.7rem, 2.9cqi, 0.875rem);
    white-space: nowrap;
  `
        : ""}
  }

  &&:hover {
    color: var(--mi-text-color);
  }

  &&[aria-current] {
    color: var(--mi-text-color);
    background-color: var(--mi-tint-x-color);
  }
`;

export type SectionAnchor = { id: string; label: string };

const SectionAnchors: React.FC<{
  anchors: SectionAnchor[];
  activeId?: string;
  inColumn?: boolean;
  className?: string;
  onAnchorClick?: (id: string) => void;
}> = ({ anchors, activeId, inColumn, className, onAnchorClick }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  if (anchors.length <= 1) {
    return null;
  }

  return (
    <nav aria-label={t("onThisPage")} className={className}>
      <ul
        className={`flex flex-wrap gap-1 list-none m-0 p-0 ${inColumn ? "justify-start" : "justify-center"}`}
      >
        {anchors.map((anchor) => (
          <li key={anchor.id}>
            <SectionAnchorLink
              href={`#${anchor.id}`}
              inColumn={inColumn}
              className="text-sm"
              aria-current={anchor.id === activeId ? "location" : undefined}
              onClick={() => onAnchorClick?.(anchor.id)}
            >
              {anchor.label}
              {!inColumn && (
                <span aria-hidden className="text-(--mi-button-color)">
                  ↓
                </span>
              )}
            </SectionAnchorLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SectionAnchors;
