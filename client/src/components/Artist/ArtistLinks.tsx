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
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import Avatar from "./Avatar";
import { ArtistTitle } from "components/common/ArtistHeaderSection";
import { FaChevronLeft } from "react-icons/fa";

const ArtistLinks: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId } = useParams();

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  if (!artist || artist.linksJson?.length === 0) {
    return null;
  }

  const artistBanner = artist?.banner?.sizes;
  const artistAvatar = artist?.avatar;

  return (
    // <ArtistPageWrapper artistBanner={!!artistBanner}>
    <div>
      <div
        className={css`
          max-width: 500px;
          background: var(--mi-normal-background-color);
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
            <Link
              to={`/${artist.id}`}
              className={css`
                display: inline-flex;
                margin-top: 1rem;
                align-items: center;
              `}
            >
              <FaChevronLeft />
              Back to artist
            </Link>
          </div>
        </div>
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
                margin-right: 0;
              }

              a:hover {
                background-color: var(--mi-darken-x-background-color);
              }
            }
          `}
        >
          {artist.linksJson?.map((l) => {
            const site = findOutsideSite(l);
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
                  {site.icon} {linkUrlDisplay(l)}
                </a>
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
