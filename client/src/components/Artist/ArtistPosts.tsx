import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import { Link } from "react-router-dom";
import Overlay from "components/common/Overlay";
import PostCard from "components/common/PostCard";
import { useArtistContext } from "state/ArtistContext";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { FaRss } from "react-icons/fa";
import Button from "components/common/Button";
import styled from "@emotion/styled";
import { getArtistUrlReference, getPostURLReference } from "utils/artist";

export const PostGrid = styled.div<{}>`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4% 2.5%;

  @media screen and (max-width: ${bp.large}px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: repeat(1, 1fr);
    gap: 2%;
  }
`;

const ArtistPosts: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const {
    state: { artist },
  } = useArtistContext();

  if (!artist || artist.posts.length === 0) {
    return null;
  }

  return (
    <div>
      <SpaceBetweenDiv>
        <div></div>
        <a
          target="_blank"
          href={`${process.env.REACT_APP_API_DOMAIN}/v1/artists/${artist.id}/feed?format=rss`}
          rel="noreferrer"
        >
          <Button onlyIcon startIcon={<FaRss />} />
        </a>
      </SpaceBetweenDiv>
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
        <PostGrid>
          {artist.posts?.map((p) => (
            <Link
              to={getPostURLReference(p)}
              className={css`
                display: flex;
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
              <PostCard
                width="100%"
                height="350px"
                dateposition="auto"
                p={{ ...p, artist: artist }}
              />
            </Link>
          ))}
        </PostGrid>
      </div>
    </div>
  );
};

export default ArtistPosts;
