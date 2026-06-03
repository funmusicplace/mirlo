import { css } from "@emotion/css";
import styled from "@emotion/styled";
import Avatar from "components/Artist/Avatar";
import ClickToPlayTracks from "components/common/ClickToPlayTracks";
import FollowArtist from "components/common/FollowArtist";
import ShareButton from "components/common/ShareButton";
import SupportArtist from "components/common/SupportArtist";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getPostURLReference } from "utils/artist";
import useIsSubscribedToArtist from "utils/useIsSubscribedToArtist";
import { useMatchMedia } from "utils/useMatchMedia";

import { bp } from "../../constants";

const AvatarWrapper = styled.div`
  margin-right: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 0.25rem;
  line-height: 1.5rem;
  font-size: 0.875rem;

  a {
    display: inline-flex;
    align-items: center;
    margin-left: 0.35rem;
  }

  img {
    margin-right: 0.2rem;
    max-width: 25px;
  }
`;

const AvatarLink: React.FC<{
  avatar?: string;
  name?: string;
  to: string;
}> = ({ avatar, name, to }) => (
  <Link
    to={to}
    className={css`
      display: flex;
      gap: 0.25rem;
    `}
  >
    <Avatar avatar={avatar} /> <span>{name}</span>
  </Link>
);

const PostHeader: React.FC<{ post: Post }> = ({ post }) => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "post" });
  const { t: tShare } = useTranslation("translation", { keyPrefix: "share" });
  const isSubscribed = useIsSubscribedToArtist(post.artistId);
  const isMobile = useMatchMedia(`screen and (max-width: ${bp.medium}px)`);

  const featuredImage = post.featuredImage?.src;

  const trackIds = post.tracks
    ?.filter((track) => track.isPlayable)
    .map((track) => track.trackId);

  const bylineInner = post.artist ? (
    <>
      {trackIds && trackIds.length > 0 && (
        <ClickToPlayTracks
          trackIds={trackIds}
          className={css`
            width: 50px !important;
            margin-right: 10px;
          `}
        />
      )}
      <AvatarWrapper>
        <Trans
          t={t}
          i18nKey="postByArtist"
          components={{
            link: (
              <AvatarLink
                avatar={post.artist.avatar?.sizes?.[60]}
                to={`/${post.artist.urlSlug?.toLowerCase() ?? post.artistId}`}
                name={post.artist.name}
              ></AvatarLink>
            ),
          }}
        />
        <span
          aria-hidden
          className={css`
            padding: 0 0.4rem;
          `}
        >
          ·
        </span>
        <span>
          {t("publishedAt", {
            date: formatDate({
              date: post.publishedAt,
              i18n,
              options: {
                dateStyle: "medium",
              },
            }),
          })}
        </span>
      </AvatarWrapper>
    </>
  ) : null;

  const actionButtons = post.artistId ? (
    <div
      className={css`
        display: flex;
        align-items: center;
        gap: 0.5rem;
      `}
    >
      <SupportArtist
        artistId={post.artistId}
        compact
        variant={featuredImage && isMobile ? "default" : "outlined"}
      />
      <ShareButton
        title={post.title}
        url={`${import.meta.env.VITE_CLIENT_DOMAIN}${getPostURLReference(post)}`}
        modalTitle={tShare("sharePost") ?? ""}
        size="compact"
      />
    </div>
  ) : null;

  return (
    <div
      className={css`
        min-height: ${featuredImage ? "40vh" : "min-height: 20vh"};
        overflow: none;
        position: relative;

        @media (max-width: ${bp.medium}px) {
          min-height: ${featuredImage ? "50vh" : "min-height: 20vh"};
        }
      `}
    >
      {featuredImage && (
        <img
          className={css`
            width: 100%;
            object-fit: cover;
            height: 100%;
            z-index: 0;
            position: absolute;
          `}
          src={featuredImage}
        />
      )}
      <div
        className={css`
          ${featuredImage
            ? `background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 1) 100%
          )`
            : ""};
          min-height: ${featuredImage ? "40vh" : "min-height: 20vh"};

          display: flex;
          ${featuredImage ? "align-items: flex-end" : ""};
          position: relative;
          z-index: 1;

          @media (max-width: ${bp.medium}px) {
            min-height: ${featuredImage ? "50vh" : "min-height: 20vh"};
          }
        `}
      >
        <div
          className={
            "max-w-[824px] px-4 md:px-12 flex pt-8 md:pt-12 w-full justify-center " +
            css`
              margin: 0 auto 0;
              position: relative;
              color: ${featuredImage
                ? "var(--mi-white)"
                : "var(--mi-button-color)"} !important;

              @media (max-width: ${bp.medium}px) {
                ${featuredImage
                  ? "a { color: var(--mi-white) !important; }"
                  : ""}
              }

              @media (min-width: ${bp.medium}px) {
                font-size: 1.2rem;
                font-weight: 100;
                line-height: 1.5rem;
                ${featuredImage
                  ? `background: var(--mi-white);
                     color: var(--mi-black) !important;
                     a { color: var(--mi-black) !important; }
                     border-radius: 0.5rem 0.5rem 0 0;`
                  : ""}
              }
            `
          }
        >
          <div
            className={css`
              flex: 100%;
              width: 100%;
              ${!featuredImage
                ? "border-bottom: 1px solid var(--mi-tint-color);"
                : ""}

              @media (min-width: ${bp.medium}px) {
                ${featuredImage
                  ? "border-bottom: 1px solid var(--mi-darken-x-background-color);"
                  : ""}
              }
            `}
          >
            <div
              className={css`
                display: flex;
                justify-content: space-between;
                align-items: center;
              `}
            >
              <h1
                className={
                  "mb-1 text-4xl! font-bold! " +
                  css`
                    @media (max-width: ${bp.medium}px) {
                      font-size: 2rem;
                    }
                  `
                }
              >
                {post.title}
              </h1>
            </div>
            {post.artist &&
              (isSubscribed ? (
                <div
                  className={css`
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    min-height: 3.5rem;
                    padding-top: 0.5rem;
                    margin-bottom: 0.5rem;
                  `}
                >
                  <div
                    className={css`
                      display: flex;
                      align-items: center;
                      align-self: flex-start;
                      min-width: 0;
                    `}
                  >
                    {bylineInner}
                  </div>
                  {actionButtons}
                </div>
              ) : (
                <>
                  <div
                    className={css`
                      display: flex;
                      align-items: center;
                      width: 100%;
                      padding-top: 0.5rem;
                    `}
                  >
                    {bylineInner}
                  </div>
                  {post.artistId && (
                    <div
                      className={css`
                        margin-top: 1rem;
                        margin-bottom: 0.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 0.5rem;
                      `}
                    >
                      <FollowArtist
                        artistId={post.artistId}
                        hideWhenSubscribed
                        variant={
                          featuredImage && isMobile ? "default" : "outlined"
                        }
                      />
                      {actionButtons}
                    </div>
                  )}
                </>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostHeader;
