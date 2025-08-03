import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import { useArtistContext } from "state/ArtistContext";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { FaRss } from "react-icons/fa";
import { ButtonAnchor } from "components/common/Button";
import PostGrid from "components/Post/PostGrid";

const ArtistPosts: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const {
    state: { artist },
  } = useArtistContext();

  const posts = React.useMemo(() => {
    return artist?.posts?.map((p) => ({ ...p, artist }));
  }, [artist]);

  if (!artist || artist.posts.length === 0) {
    return null;
  }

  return (
    <div>
      <SpaceBetweenDiv>
        <div></div>
        <ButtonAnchor
          target="_blank"
          href={`${import.meta.env.VITE_API_DOMAIN}/v1/artists/${artist.id}/feed?format=rss`}
          rel="noreferrer"
          onlyIcon
          startIcon={<FaRss />}
        />
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
          {artist.posts?.length === 0 && <>{t("noUpdates", {artistName: artist.name})}</>}
        </div>
        <PostGrid posts={posts} ariaLabelledBy="artist-navlink-updates" />
      </div>
    </div>
  );
};

export default ArtistPosts;
