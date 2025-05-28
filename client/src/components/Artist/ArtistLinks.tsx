import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";

import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { Link, useParams } from "react-router-dom";
import {
  findOutsideSite,
  linkUrlDisplay,
  linkUrlHref,
} from "components/common/LinkIconDisplay";
import Avatar from "./Avatar";
import { ArtistTitle } from "components/common/ArtistHeaderSection";
import { FaChevronLeft } from "react-icons/fa";
import { ArtistButtonAnchor, ArtistButtonLink } from "./ArtistButtons";

const ArtistLinks: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId } = useParams();

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  if (!artist || artist.linksJson?.length === 0) {
    return null;
  }

  const artistAvatar = artist?.avatar;
  const colors = artist?.properties?.colors;

  return (
    // <ArtistPageWrapper artistBanner={!!artistBanner}>
    <div>
      <div
        className={css`
          max-width: 500px;
          margin: 3rem auto;
          padding: 4rem 3rem;

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0 0 7.5rem 0 !important;
          }
        `}
      >
        <div
          className={css`
            display: flex;
            margin-bottom: 2rem;

            div {
              margin-right: 1rem;
            }
          `}
        >
          {artistAvatar && (
            <Avatar
              avatar={
                artistAvatar?.sizes?.[300] + `?${artistAvatar?.updatedAt}`
              }
            />
          )}
          <div>
            <ArtistTitle artistAvatar={!!artistAvatar}>
              {artist.name}
            </ArtistTitle>
            <ArtistButtonLink
              to={`/${artist.id}`}
              startIcon={<FaChevronLeft />}
              variant="link"
              className={css`
                display: inline-flex;
                margin-top: 1rem;
                align-items: center;
              `}
            >
              {t("backToArtist")}
            </ArtistButtonLink>
          </div>
        </div>
        <ul
          className={css`
            padding-bottom: 0.7rem;
            display: flex;
            flex-direction: column;

            list-style: none;

            li {
              border: 1px solid
                ${colors?.primary ?? "var(--mi-darken-background-color)"};
              margin: 0.5rem;

              a {
                padding: 1.6rem !important;
                font-size: 1rem;
                text-decoration: none;
                margin-right: 0;
              }

              a:hover {
                background-color: ${colors?.background ??
                "var(--mi-darken-background-color)"};
              }
            }
          `}
        >
          {artist.linksJson?.map((l) => {
            const site = findOutsideSite(l);
            return (
              <li key={l.url}>
                <ArtistButtonAnchor
                  rel="me"
                  href={linkUrlHref(l.url, true)}
                  target="_blank"
                  variant="link"
                  startIcon={site?.icon}
                  className={css`
                    align-items: center;
                    margin-right: 0.75rem;
                    ${colors?.foreground ?? "var(--mi-foreground-color)"};
                  `}
                >
                  {linkUrlDisplay(l)}
                </ArtistButtonAnchor>
              </li>
            );
          })}
          {artist.linksJson?.length === 0 && <>{t("noUpdates")}</>}
        </ul>
      </div>
    </div>
    // </ArtistPageWrapper>
  );
};

export default ArtistLinks;
