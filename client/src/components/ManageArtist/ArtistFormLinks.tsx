import { css } from "@emotion/css";
import { ArtistButtonAnchor } from "components/Artist/ArtistButtons";
import {
  findOutsideSite,
  linkUrlHref,
} from "components/common/LinkIconDisplay";
import React from "react";
import { transformFromLinks } from "utils/links";

import { bp } from "../../constants";

interface ArtistFormLinksProps {
  artist: Pick<Artist, "linksJson" | "links">;
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

        a {
          display: inline-flex;
          align-items: center;
          margin-right: 0.75rem;

          > svg {
            margin-right: 0.5rem;
          }

          > img {
            margin-right: 0.5rem;
          }
        }

        a:last-child {
          margin-right: 0;
        }

        @media screen and (max-width: ${bp.medium}px) {
          padding: var(--mi-side-paddings-xsmall);
        }
      `}
    >
      {links
        .slice()
        .sort((l) => (findOutsideSite(l).showFull ? 1 : -1))
        .map((l) => {
          const site = findOutsideSite(l);
          return (
            <ArtistButtonAnchor
              rel="me"
              href={linkUrlHref(l.url, true)}
              key={l.url}
              variant="link"
              startIcon={site?.icon}
              target="_blank"
              className={css`
                display: inline-flex;
                align-items: center;
              `}
            >
              {site.showFull ? l.linkLabel || l.url : ""}
            </ArtistButtonAnchor>
          );
        })}
    </div>
  );
};

export default ArtistFormLinks;
