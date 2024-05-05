import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import PostCard from "components/common/PostCard";
import { useArtistContext } from "state/ArtistContext";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { FaRss } from "react-icons/fa";
import Button from "components/common/Button";
import styled from "@emotion/styled";

export const PostGrid = styled.div<{}>`
  display: grid;
  grid-template-columns: repeat(3, 31.6%);
  gap: 4% 2.5%;
  max-width: 100%;
  list-style-type: none;

  @media screen and (max-width: ${bp.large}px) {
    grid-template-columns: repeat(2, 48.75%);
  }

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: repeat(1, 100%);
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
          href={`${import.meta.env.VITE_API_DOMAIN}/v1/artists/${artist.id}/feed?format=rss`}
          rel="noreferrer"
        >
          <Button onlyIcon startIcon={<FaRss />} />
        </a>
      </SpaceBetweenDiv>
      <div
        className={css`
          @media screen and (max-width: ${bp.medium}px) {
            padding: 0 0 7.5rem 0 !important;
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
        <PostGrid as="ul">
          {artist.posts?.map((p) => (
            <li key={p.id}>
              <PostCard p={{ ...p, artist: artist }} />
            </li>
          ))}
        </PostGrid>
      </div>
    </div>
  );
};

export default ArtistPosts;
