import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import { Link } from "react-router-dom";
import Overlay from "components/common/Overlay";
import PostCard from "components/common/PostCard";

const ArtistPosts: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!artist || artist.trackGroups.length === 0) {
    return null;
  }

  return (
    <div>
      <h2
        className={css`
          margin-bottom: 0rem;
        `}
      >
        {t("updates")}
      </h2>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: center;

          a:hover {
            text-decoration: none;
          }

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0rem !important;
            background: var(--mi-light-background-color);
          }
        `}
      >
        <div
          className={css`
            padding-bottom: 0.7rem;
          `}
        >
          {artist.posts?.length === 0 && <>{t("noUpdates")}</>}
        </div>
        {artist.posts?.map((p) => (
          <Link
            to={`/post/${p.id}/`}
            className={css`
              display: flex;
              margin-bottom: 0.5rem;
              border-radius: 10px;
              background-color: var(--mi-darken-background-color);
              filter: brightness(95%);
              width: 100%;

              :hover {
                transition: 0.2s ease-in-out;
                text-decoration: none;
                background-color: rgba(50, 0, 0, 0.07);
                filter: brightness(90%);
              }
              @media (prefers-color-scheme: dark) {
                :hover {
                  filter: brightness(90%);
                }
              }
            `}
          >
            <Overlay width="100%" height="165px"></Overlay>
            <PostCard
              width="100%"
              height="165px"
              dateposition="auto"
              p={p}
            ></PostCard>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ArtistPosts;
