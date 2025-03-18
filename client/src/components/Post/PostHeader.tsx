import { css } from "@emotion/css";
import { ButtonLink } from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import FollowArtist from "components/common/FollowArtist";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Avatar from "components/Artist/Avatar";

import { useAuthContext } from "state/AuthContext";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import TipArtist from "components/common/TipArtist";

const PostHeader: React.FC<{ post: Post }> = ({ post }) => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "post" });

  const { user } = useAuthContext();

  const ownedByUser = post.artist?.userId === user?.id;

  const featuredImage = post.featuredImage?.src;

  return (
    <div
      className={css`
        height: ${featuredImage ? "50vh" : "20vh"};
        overflow: none;
        position: relative;

        @media (max-width: ${bp.medium}px) {
          height: ${featuredImage ? "70vh" : "30vh"};
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
          height: 100%;
          display: flex;
          align-items: flex-end;
          position: relative;
          z-index: 1;
        `}
      >
        <div
          className={css`
        padding: 1rem;
    margin: 0 auto 0;
    background: 
    display: flex;
    max-width: var(--mi-container-medium);

    justify-content: center;
    width: 100%;
    position: relative;
    color: ${featuredImage ? "var(--mi-white)" : post?.artist?.properties?.colors?.primary} !important;

    h1 {
      margin-bottom: 0.5rem;
      font-size: 3rem;
    }

    @media (min-width: ${bp.medium}px) {
      font-size: 1.2rem;
      font-weight: 100;
      line-height: 1.5rem;
    }
  `}
        >
          {post.artistId && (
            <div
              className={css`
                position: absolute;
              `}
            >
              <div
                className={css`
                  position: fixed;
                  right: 1rem;
                  top: 4rem;
                `}
              >
                <TipArtist artistId={post.artistId} transparent={false} />
              </div>
            </div>
          )}
          <div
            className={css`
              flex: 100%;
              max-width: 700px;
            `}
          >
            <div
              className={css`
                display: flex;
                justify-content: space-between;
                align-items: center;
              `}
            >
              <h1>{post.title}</h1>
              {(ownedByUser || user?.isAdmin) && (
                <ButtonLink
                  to={`/manage/artists/${post.artistId}/post/${post.id}`}
                  variant="dashed"
                  startIcon={<FaPen />}
                  size="compact"
                >
                  {t("edit")}
                </ButtonLink>
              )}
            </div>
            {post.artist && (
              <SpaceBetweenDiv
                className={css`
                  padding-top: 0.5rem;
                `}
              >
                <div>
                  <div
                    className={css`
                      margin-right: 0.25rem;
                      display: flex;
                      line-height: 2.2rem;

                      a {
                        display: inline-flex;
                        align-items: center;
                        margin-left: 0.35rem;
                      }

                      img {
                        margin-right: 0.2rem;
                        max-width: 25px;
                      }
                    `}
                  >
                    by{" "}
                    <Link
                      to={`/${post.artist.urlSlug?.toLowerCase() ?? post.artistId}`}
                    >
                      <Avatar avatar={post.artist.avatar?.sizes?.[60]} />
                      <span>{post.artist?.name}</span>
                    </Link>
                  </div>
                  <em>
                    {t("publishedAt", {
                      date: formatDate({
                        date: post.publishedAt,
                        i18n,
                        options: {
                          dateStyle: "medium",
                          timeStyle: "short",
                        },
                      }),
                    })}
                  </em>
                </div>
                {post.artistId && <FollowArtist artistId={post.artistId} />}
              </SpaceBetweenDiv>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostHeader;
