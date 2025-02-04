import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ManageSectionWrapper from "../ManageSectionWrapper";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import PostForm from "./PostForm";

import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist, queryManagedPost } from "queries";

const ManagePost: React.FC<{}> = () => {
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

export default ManagePost;
