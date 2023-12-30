import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import { Link } from "react-router-dom";
import Overlay from "components/common/Overlay";
import PostCard from "components/common/PostCard";
import { useArtistContext } from "state/ArtistContext";
import HeaderDiv from "components/common/HeaderDiv";
import { FaRss } from "react-icons/fa";
import Button from "components/common/Button";

const ArtistPosts: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const {
    state: { artist },
  } = useArtistContext();

  if (!artist || artist.trackGroups.length === 0) {
    return null;
  }

  return (
    <div>
      <HeaderDiv>
        <div>
        </div>
        <a
          target="_blank"
          href={`${process.env.REACT_APP_API_DOMAIN}/v1/artists/${artist.id}/feed?format=rss`}
          rel="noreferrer"
        >
          <Button onlyIcon startIcon={<FaRss />} />
        </a>
      </HeaderDiv>
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
        <div
          className={css`
            margin-top: 0;
            display: flex;
            flex-wrap: wrap;
            justify-content: ${artist.posts?.length % 3 === 2
              ? "flex-start"
              : "space-between"};
            width: 100%;
            a {
              width: 32.4%;
            }
            @media screen and (max-width: ${bp.medium}px) {
              flex-direction: column;
              a {
                width: 100%;
              }
            }
          `}
        >
          {artist.posts?.map((p) => (
            <Link
              to={`/post/${p.id}/`}
              className={css`
                display: flex;
                margin-right: ${artist.posts?.length % 3 === 2 ? "1.2%" : ""};
                margin-bottom: 1rem;
                border-radius: 10px;
                background-color: var(--mi-darken-background-color);
                filter: brightness(95%);
                width: 100%;

                &:hover {
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
              <Overlay width="100%" height="100%"></Overlay>
              <PostCard width="100%" height="350px" dateposition="auto" p={p} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArtistPosts;
