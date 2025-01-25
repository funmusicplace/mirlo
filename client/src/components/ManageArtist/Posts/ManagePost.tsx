import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPostURLReference } from "utils/artist";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ManageSectionWrapper from "../ManageSectionWrapper";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import BackToArtistLink from "../BackToArtistLink";
import PostForm from "./PostForm";
import Post from "components/Post";
import { ButtonLink } from "components/common/Button";
import { bp } from "../../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist, queryManagedPost } from "queries";
import { FaEye } from "react-icons/fa";

const ManagePost: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "managePost" });

  const { postId, artistId } = useParams();

  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const {
    data: post,
    isLoading,
    refetch,
  } = useQuery(queryManagedPost(Number(postId)));

  if (!post && isLoading) {
    return <LoadingBlocks />;
  } else if (!Post) {
    return null;
  }

  const isPublished =
    post && !post.isDraft && new Date(post.publishedAt) < new Date();

  return (
    <ManageSectionWrapper
      className={css`
        padding-top: 1rem !important;
        max-width: var(--mi-container-medium);
        margin: 0 auto;
      `}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-top: 1rem;

          @media screen and (max-width: ${bp.medium}px) {
            padding-top: 0.5rem;
          }
        `}
      >
        <BackToArtistLink subPage="posts" />
        <SpaceBetweenDiv>
          <h1
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            {t("managePost")}
          </h1>
          {post && isPublished && (
            <div
              className={css`
                display: flex;
                align-items: center;
              `}
            >
              <ButtonLink
                to={getPostURLReference({ ...post, artist })}
                startIcon={<FaEye />}
              >
                {t("viewLive")}
              </ButtonLink>
            </div>
          )}
        </SpaceBetweenDiv>
      </div>
      {artist && post && (
        <PostForm post={post} reload={() => refetch()} artist={artist} />
      )}
    </ManageSectionWrapper>
  );
};

export default ManagePost;
