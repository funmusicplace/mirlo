import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";

import PostGrid from "components/Post/PostGrid";
import { queryArtist, queryArtistPosts } from "queries";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import usePagination from "utils/usePagination";

const pageSize = 6;

const ArtistPosts: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId } = useParams();
  const { page, PaginationComponent } = usePagination({ pageSize });

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: posts } = useQuery(
    queryArtistPosts({
      artistId: artistId ?? "",
      take: pageSize,
      skip: pageSize * page,
    })
  );

  if (!posts || !artist || posts?.results?.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        className={css`
          margin-bottom: 2rem;
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
        <PostGrid
          posts={posts.results}
          ariaLabelledBy="artist-navlink-updates"
        />
      </div>
      {posts.total && <PaginationComponent total={posts.total} />}
    </div>
  );
};

export default ArtistPosts;
