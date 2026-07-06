import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { useTransparentContainer } from "components/ArtistColorsProvider";
import {
  findOutsideSite,
  linkUrlDisplay,
  linkUrlHref,
} from "components/common/LinkIconDisplay";
import WidthContainer from "components/common/WidthContainer";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { transformFromLinks } from "utils/links";

import { bp } from "../../../constants";

import { ArtistButtonAnchor } from "components/Artist/ArtistButtons";
import { linkCardClass, linkCardOnTransparentClass } from "components/Artist/linkCardStyle";
import LinkPageHeader from "components/Artist/LinkPageHeader";

const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId } = useParams();
  const transparent = useTransparentContainer();

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const allLinks = artist ? transformFromLinks(artist).linkArray : [];

  if (!artist || allLinks.length === 0) {
    return null;
  }

  return (
    <WidthContainer variant="medium">
      <div
        className={css`
          padding: 3rem;
          @media screen and (max-width: ${bp.medium}px) {
            width: 90%;
            margin: 0 auto;
            padding: 2rem var(--mi-side-paddings-small);
          }
        `}
      >
        <LinkPageHeader artist={artist} />
        <ul
          className={css`
            padding-bottom: 0.7rem;
            display: flex;
            flex-direction: column;
            list-style: none;

            li a {
              padding: 1.6rem !important;
              text-decoration: none;
              margin-right: 0;
              width: 100% !important;
              text-wrap: auto;
              text-align: center;
            }

            li a svg {
              width: 1.25rem;
              height: 1.25rem;
            }

            li a:hover {
              background-color: var(--mi-tint-color) !important;
            }
          `}
        >
          {allLinks.map((l) => {
            const site = findOutsideSite(l);
            return (
              <li
                key={l.url}
                className={`${linkCardClass} ${transparent ? linkCardOnTransparentClass : ""}`}
              >
                <ArtistButtonAnchor
                  rel="me"
                  href={linkUrlHref(l.url, true)}
                  target="_blank"
                  variant="link"
                  startIcon={site?.icon}
                  className={`text-lg ${css`
                    align-items: center;
                    margin-right: 0.75rem;
                  `}`}
                >
                  <div
                    className={css`
                      width: 100% !important;
                      a {
                        width: 100% !important;
                      }
                    `}
                  >
                    {linkUrlDisplay(l)}
                  </div>
                </ArtistButtonAnchor>
              </li>
            );
          })}
          {allLinks.length === 0 && (
            <>{t("noUpdates", { artistName: artist.name })}</>
          )}
        </ul>
      </div>
    </WidthContainer>
  );
};

export default Index;
