import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";

import PostGrid from "components/Post/PostGrid";
import { queryArtist } from "queries";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

const ArtistPosts: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId } = useParams();

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const posts = React.useMemo(() => {
    return artist?.posts?.map((p) => ({ ...p, artist }));
  }, [artist]);

  if (!artist || artist.posts.length === 0) {
    return null;
  }

  return (
    <div>
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
        <PostGrid posts={posts} ariaLabelledBy="artist-navlink-updates" />
      </div>
    </div>
  );
};

export default ArtistPosts;
