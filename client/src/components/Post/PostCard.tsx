import React from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/css";
import Box from "components/common/Box";
import { Link } from "react-router-dom";
import { getArtistUrl, getPostURLReference } from "utils/artist";
import Overlay from "components/common/Overlay";
import { useLinkContainer } from "utils/useLinkContainer";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { Trans, useTranslation } from "react-i18next";
import { sample } from "lodash";

const HalfTone: React.FC<{ color1?: string; color2?: string }> = ({
  color1,
  color2,
}) => {
  return (
    <div
      className={css`
        --mask: linear-gradient(rgb(0 0 0), rgb(0 0 0 / 0.5));
        --stop1: 3%;
        --stop2: 90%;

        aspect-ratio: 1;
        position: relative;
        background: ${color1 || "var(--mi-white)"};
        filter: contrast(50);

        &:after {
          content: "";
          position: absolute;
          inset: 0;

          background-repeat: round;
          mask-image: var(--mask);

          --bgSize: ${sample([".7rem", ".5rem"])};
          --bgPosition: calc(var(--bgSize) / 2);
          --stop1: 3%;
          --stop2: 65%;

          background-image: radial-gradient(
              circle at center,
              ${color2 || "var(--mi-pink)"} var(--stop1),
              transparent var(--stop2)
            ),
            radial-gradient(
              circle at center,
              ${color2 || "var(--mi-pink)"} var(--stop1),
              transparent var(--stop2)
            );
          background-size: var(--bgSize) var(--bgSize);
          background-position:
            0 0,
            var(--bgPosition) var(--bgPosition);
        }
      `}
    ></div>
  );
};

const PostContainer = styled.li`
  display: flex;
  border-radius: 5px;
  background-color: var(--mi-darken-background-color);
  position: relative;
  filter: brightness(98%);
  width: 100%;
  cursor: pointer;

  .post-container__link {
    text-decoration: none;
    overflow: hidden;
    display: inline-block;
    text-align: left;
    height: 1.5rem;
    width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    transition: 0.2s ease-in-out;
    background-color: rgba(50, 0, 0, 0.07);
    filter: brightness(90%);

    .post-container__link {
      text-decoration: underline;
    }
  }

  &:focus-within {
    outline: 1px solid var(--mi-normal-foreground-color);
  }

  @media (prefers-color-scheme: dark) {
    &:hover {
      filter: brightness(120%);
      background-color: rgba(100, 100, 100, 0.2);
    }
  }
`;

const PostCard: React.FC<{
  post: Post;
}> = ({ post }) => {
  const postUrl = getPostURLReference(post);
  const postContainerProps = useLinkContainer({ to: postUrl });
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { i18n } = useTranslation("translation", {
    keyPrefix: "post",
  });

  return (
    <PostContainer {...postContainerProps}>
      <Overlay width="100%" height="100%" />
      <Box
        className={css`
          height: 350px;
          width: 100% !important;
          border: solid 1px transparent;
          margin-bottom: 0 !important;
          overflow: hidden;
          padding: 0 !important;
          justify-content: space-between;
          position: relative;

          @media (prefers-color-scheme: dark) {
            background-color: var(--mi-normal-background-color);
          }
        `}
      >
        <div
          className={css`
            height: 65%;
            z-index: 0;
            position: relative;
            overflow: hidden;
          `}
        >
          {post.featuredImage ? (
            <img
              src={post.featuredImage?.src}
              className={css`
                object-fit: cover;
                height: 100%;
                width: 100%;
              `}
            />
          ) : (
            <HalfTone
              color1={post.artist?.properties?.colors?.primary}
              color2={post.artist?.properties?.colors?.secondary}
            />
          )}
        </div>
        <div
          className={css`
            padding: 1.5rem;
            margin: 0;
            z-index: 1;
            position: relative;
            width: 100%;
            overflow: hidden;
            transition: 0.2s ease-in-out;
            ${!post.featuredImage ? "height: 100%;" : ""}
            background-color: var(--mi-normal-background-color);
          `}
        >
          {post.artist && (
            <div
              className={css`
                padding-bottom: 2rem;
              `}
            >
              <p
                className={css`
                  white-space: nowrap;
                  width: 90%;
                  text-overflow: ellipsis;
                  padding-right: 3rem;
                  position: absolute;
                `}
              >
                <Trans
                  t={t}
                  i18nKey="postByArtist"
                  values={{ artistName: post.artist?.name }}
                  components={{
                    link: <Link to={getArtistUrl(post.artist)}></Link>,
                  }}
                />
              </p>
            </div>
          )}
          <div
            className={css`
              width: 100%;
              margin-bottom: 0.5rem;
            `}
          >
            <h3
              className={
                "h4 " +
                css`
                  padding-bottom: 0.3rem;
                  text-align: left;
                `
              }
            >
              {post.artist && (
                <Link
                  to={postUrl}
                  className={
                    "post-container__link " +
                    css`
                      font-weight: normal;
                      text-align: center;
                      color: var(--mi-normal-foreground-color);
                    `
                  }
                >
                  {post.title}
                </Link>
              )}
            </h3>
            <p
              className={css`
                color: var(--mi-light-foreground-color);
                text-transform: uppercase;
                font-size: var(--mi-font-size-small);
              `}
            >
              {formatDate({
                date: post.publishedAt,
                i18n,
              })}
            </p>
          </div>
        </div>
      </Box>
    </PostContainer>
  );
};
export default PostCard;
