import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { queryManagedArtist, queryManagedPost } from "queries";
import React from "react";
import { useParams } from "react-router-dom";

import ManageSectionWrapper from "components/ManageArtist/ManageSectionWrapper";

import PostForm from "components/ManageArtist/Posts/PostForm";

const Index: React.FC<{}> = () => {
  const { postId, artistId } = useParams();

  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const {
    data: post,
    isLoading,
    refetch,
  } = useQuery(queryManagedPost(Number(postId)));

  if (!post && isLoading) {
    return <LoadingBlocks />;
  } else if (!post) {
    return null;
  }

  return (
    <ManageSectionWrapper
      className={css`
        padding-top: 1rem !important;
        max-width: var(--mi-container-medium);
        margin: 0 auto;
        position: relative;
      `}
    >
      {artist && post && (
        <PostForm post={post} reload={() => refetch()} artist={artist} />
      )}
    </ManageSectionWrapper>
  );
};

export default Index;
