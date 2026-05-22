import { css } from "@emotion/css";
import React from "react";
import { useScrollActiveTabIntoView } from "utils/useScrollActiveTabIntoView";

import { bp } from "../../constants";

import ScrollFadeOverlay from "./ScrollFadeOverlay";
import Tabs from "./Tabs";

const baseTabsStyle = css`
  padding: 0;
  white-space: nowrap;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  li {
    margin-top: 1rem !important;
  }

  @media (min-width: 640px) {
    a {
      padding-bottom: calc(1rem - 4px) !important;
    }
  }

  @media (max-width: 1279px) {
    padding: var(--mi-side-paddings-xsmall);
  }

  @media (max-width: ${bp.medium}px) {
    border-bottom: 1px solid var(--mi-tint-x-color);
    margin-top: 0 !important;

    a {
      font-size: 0.75rem !important;
    }
  }
`;

const uppercaseStyle = css`
  text-transform: uppercase;
`;

const opaqueMobileStyle = css`
  @media (max-width: ${bp.medium}px) {
    background: var(--mi-darken-background-color);
  }
`;

export const SectionNav: React.FC<{
  children: React.ReactNode;
  uppercase?: boolean;
  transparent?: boolean;
}> = ({ children, uppercase = true, transparent = false }) => {
  const reactId = React.useId();
  const scrollId = `section-nav-scroll-${reactId.replace(/:/g, "")}`;
  useScrollActiveTabIntoView(scrollId);

  const className = [
    baseTabsStyle,
    uppercase ? uppercaseStyle : "",
    transparent ? "" : opaqueMobileStyle,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative">
      <Tabs id={scrollId} className={className}>
        {children}
      </Tabs>
      <ScrollFadeOverlay
        scrollElementId={scrollId}
        position="left"
        size="2rem"
      />
      <ScrollFadeOverlay
        scrollElementId={scrollId}
        position="right"
        size="2rem"
      />
    </div>
  );
};

export default SectionNav;
