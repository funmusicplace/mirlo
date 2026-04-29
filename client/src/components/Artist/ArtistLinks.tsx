import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistTitle } from "components/common/ArtistHeaderSection";
import {
  findOutsideSite,
  linkUrlDisplay,
  linkUrlHref,
} from "components/common/LinkIconDisplay";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronLeft, FaPen } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { getArtistManageUrl, getArtistUrl } from "utils/artist";

import { bp } from "../../constants";

import { ArtistButtonAnchor, ArtistButtonLink } from "./ArtistButtons";
import Avatar from "./Avatar";

const ArtistLinks: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId } = useParams();
  const { user } = useAuthContext();

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  if (!artist || artist.linksJson?.length === 0) {
    return null;
  }

  const artistAvatar = artist?.avatar;

  const isOwningArtist = artist?.userId === user?.id;

  return (
    <div
      className={css`
        background-color: var(--mi-background-color);
        opacity: 0.98;

        @media screen and (max-width: ${bp.medium}px) {
          width: 100%;
          padding: var(--mi-side-paddings-small);
          margin: 0;
        }
      `}
    >
      <div
        className={css`
          max-width: var(--mi-container-big);
          margin: 0rem auto;
          padding: 3rem;
          @media screen and (max-width: ${bp.medium}px) {
            width: 90%;
            padding: 2rem var(--mi-side-paddings-small);
            margin: auto;
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

            @media screen and (max-width: ${bp.medium}px) {
              div {
                margin-right: 0.5rem;
              }
            }
          `}
        >
          {artistAvatar && (
            <div>
              <Avatar
                avatar={
                  artistAvatar?.sizes?.[300] + `?${artistAvatar?.updatedAt}`
                }
              />
            </div>
          )}
          <div
            className={css`
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              justify-content: flex-start;
            `}
          >
            <ArtistTitle artistAvatar={!!artistAvatar}>
              {artist.name}
              {isOwningArtist && (
                <ArtistButtonLink
                  to={getArtistManageUrl(artist.id)}
                  variant="dashed"
                  startIcon={<FaPen />}
                />
              )}
            </ArtistTitle>
            <ArtistButtonLink
              to={getArtistUrl(artist)}
              startIcon={<FaChevronLeft />}
              variant="link"
              className={css`
                margin-top: 1rem;
              `}
            >
              {t(artist.isLabelProfile ? "backToLabel" : "backToArtist")}
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
              border: 1px solid var(--mi-button-color);
              margin: 0.5rem 0;

              a {
                padding: 1.6rem !important;
                font-size: 1rem;
                text-decoration: none;
                margin-right: 0;
              }

              a:hover {
                background-color: var(--mi-background-color);
              }
            }
          `}
        >
          {artist.linksJson?.map((l) => {
            const site = findOutsideSite(l);
            return (
              <li
                key={l.url}
                className={css`
                  width: 100% !important;
                  a {
                    width: 100% !important;
                    text-wrap: auto;
                    text-align: center;
                  }
                  a:hover {
                    background-color: var(
                      --mi-tint-color
                    ) !important;
                  }
                `}
              >
                <ArtistButtonAnchor
                  rel="me"
                  href={linkUrlHref(l.url, true)}
                  target="_blank"
                  variant="link"
                  startIcon={site?.icon}
                  className={css`
                    align-items: center;
                    margin-right: 0.75rem;
                    color: var(--mi-text-color);
                  `}
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
          {artist.linksJson?.length === 0 && (
            <>{t("noUpdates", { artistName: artist.name })}</>
          )}
        </ul>
      </div>
    </div>
    // </ArtistPageWrapper>
  );
};

export default ArtistLinks;
