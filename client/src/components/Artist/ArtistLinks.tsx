import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";

import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { useParams } from "react-router-dom";
import {
  findOutsideSite,
  linkUrlDisplay,
  linkUrlHref,
} from "components/common/LinkIconDisplay";

const ArtistLinks: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId } = useParams();

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  if (!artist || artist.linksJson?.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        className={css`
          max-width: 500px;
          margin: 0 auto;
          margin-top: 2rem;
          @media screen and (max-width: ${bp.medium}px) {
            padding: 0 0 7.5rem 0 !important;
          }
        `}
      >
        <ul
          className={css`
            padding-bottom: 0.7rem;
            display: flex;
            flex-direction: column;

            list-style: none;

            li {
              border: 1px solid var(--mi-darken-background-color);
              margin: 0.5rem;

              a {
                padding: 0.8rem;
                display: block;
                font-size: 1rem;
                text-decoration: none;
              }

              a:hover {
                background-color: var(--mi-darken-x-background-color);
              }
            }
          `}
        >
          {artist.linksJson?.map((l) => {
            const site = findOutsideSite(l.url);
            return (
              <li key={l.url}>
                <a
                  rel="me"
                  href={linkUrlHref(l.url, true)}
                  target="_blank"
                  className={css`
                    display: inline-flex;
                    align-items: center;
                    margin-right: 0.75rem;
                    color: var(--mi-normal-foreground-color);

                    > svg {
                      margin-right: 0.5rem;
                    }
                  `}
                >
                  {site.icon} {linkUrlDisplay(l.url)}
                </a>
              </li>
            );
          })}
          {artist.linksJson?.length === 0 && <>{t("noUpdates")}</>}
        </ul>
      </div>
    </div>
  );
};

export default ArtistLinks;
