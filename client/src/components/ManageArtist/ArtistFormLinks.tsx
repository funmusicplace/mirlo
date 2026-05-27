import { css } from "@emotion/css";
import { ArtistButtonAnchor } from "components/Artist/ArtistButtons";
import {
  findOutsideSite,
  linkUrlHref,
} from "components/common/LinkIconDisplay";
import React from "react";
import { transformFromLinks } from "utils/links";

import { bp } from "../../constants";

export const navbarLinkStripStyles = css`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: safe flex-end;
  gap: 0.5rem;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    display: none;
  }

  > a {
    flex-shrink: 0;
  }
`;

interface ArtistFormLinksProps {
  artist: Pick<Artist, "linksJson" | "links">;
}

export function renderArtistLinkButtons(links: Link[]) {
  return links
    .slice()
    .sort(
      (a, b) =>
        Number(findOutsideSite(a).showFull) -
        Number(findOutsideSite(b).showFull)
    )
    .map((l) => {
      const site = findOutsideSite(l);
      const iconOnly = !site.showFull;
      return (
        <ArtistButtonAnchor
          rel="me"
          href={linkUrlHref(l.url, true)}
          key={l.url}
          variant={iconOnly ? "link" : "chip"}
          onlyIcon={iconOnly}
          startIcon={site?.icon}
          target="_blank"
        >
          {site.showFull ? l.linkLabel || l.url : ""}
        </ArtistButtonAnchor>
      );
    });
}

const ArtistFormLinks: React.FC<ArtistFormLinksProps> = ({ artist }) => {
  const links = transformFromLinks(artist).linkArray.filter((l) => l.inHeader);

  if (links.length === 0) {
    return null;
  }

  return (
    <div
      className={css`
        max-width: 100%;
        overflow: auto;
        display: flex;
        justify-content: flex-start;
        align-items: center;

        ::-webkit-scrollbar {
          width: 0;
          height: 3px;
        }
        ::-webkit-scrollbar-track {
          background-color: inset 0 0 0px rgba(0, 0, 0);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          border-radius: 4px;
          background-color: rgba(100, 100, 100, 0.5);
        }

        a:last-child {
          margin-right: 0;
        }

        @media screen and (max-width: ${bp.medium}px) {
          padding: var(--mi-side-paddings-xsmall);
        }
      `}
    >
      {renderArtistLinkButtons(links)}
    </div>
  );
};

export default ArtistFormLinks;
