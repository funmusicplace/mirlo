import { css } from "@emotion/css";
import React from "react";
import { useScrollActiveTabIntoView } from "utils/useScrollActiveTabIntoView";

import { bp } from "../../constants";

import ScrollFadeOverlay from "./ScrollFadeOverlay";
import Tabs from "./Tabs";
import WidthContainer from "./WidthContainer";

const stripStyle = css`
  width: 100%;
  border-bottom: 1px solid var(--mi-tint-x-color);
`;

const opaqueStyle = css`
  background: var(--mi-darken-background-color);
`;

const tabsStyle = css`
  --tab-font-size: 0.75rem;
  padding: var(--mi-side-paddings-xsmall);
  white-space: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  margin-top: 0 !important;

  &::-webkit-scrollbar {
    display: none;
  }

  li {
    margin-top: 1rem !important;
  }

  @media (min-width: ${bp.medium}px) {
    --tab-font-size: 1rem;

    & > li > a {
      padding-bottom: calc(1rem - 4px) !important;
    }
  }
`;

const uppercaseStyle = css`
  text-transform: uppercase;
`;

export const SectionNav: React.FC<{
  children: React.ReactNode;
  uppercase?: boolean;
  transparent?: boolean;
}> = ({ children, uppercase = true, transparent = false }) => {
  const reactId = React.useId();
  const scrollId = `section-nav-scroll-${reactId.replace(/:/g, "")}`;
  useScrollActiveTabIntoView(scrollId);

  const tabsClassName = [tabsStyle, uppercase ? uppercaseStyle : ""]
    .filter(Boolean)
    .join(" ");

  const stripClassName = [stripStyle, transparent ? "" : opaqueStyle]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={stripClassName}>
      <WidthContainer variant="big" justify="center">
        <div className="relative">
          <Tabs id={scrollId} className={tabsClassName}>
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
      </WidthContainer>
    </div>
  );
};

export default SectionNav;
