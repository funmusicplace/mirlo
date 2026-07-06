import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import PostGrid from "components/Post/PostGrid";
import { queryArtist, queryArtistPosts } from "queries";
import React from "react";
import { useParams } from "react-router-dom";
import usePagination from "utils/usePagination";

import { bp } from "../../../constants";

const pageSize = 6;

const Index: React.FC = () => {
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
        <PostGrid
          posts={posts.results}
          ariaLabelledBy="artist-navlink-updates"
        />
      </div>
      {posts.total && <PaginationComponent total={posts.total} />}
    </div>
  );
};

export default Index;
