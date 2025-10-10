import { css } from "@emotion/css";
import { MetaCard } from "components/common/MetaCard";
import parse from "html-react-parser";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { bp } from "../../constants";
import Box from "components/common/Box";

import LoadingBlocks from "components/Artist/LoadingBlocks";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import styled from "@emotion/styled";
import MarkdownWrapper from "components/common/MarkdownWrapper";

import { useQuery } from "@tanstack/react-query";
import { queryPost } from "queries";
import PostHeader from "./PostHeader";
import useArtistQuery from "utils/useArtistQuery";

export const PageMarkdownWrapper = styled.div`
  width: 100%;
  margin-top: 2rem;
  max-width: var(--mi-container-medium);
  margin: auto;
  padding: var(--mi-side-paddings-xsmall);
  font-size: 18px;
  line-height: 1.7rem;

  blockquote {
    direction: ltr;
    font-style: italic;
    padding-left: 1rem;
    border-left: solid 3px grey;
    unicode-bidi: isolate;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-weight: normal !important;
  }

  h2 {
    font-weight: normal !important;
    font-size: 1.7rem !important;
    margin-top: 1rem;
    margin-bottom: 1rem !important;
  }

  h3 {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0;
  }

  p {
    line-height: 1.7rem !important;
  }

  iframe {
    margin: 0 !important;
  }

  ul {
    margin-left: 1rem;
    margin-bottom: 1rem;
    line-height: 1.7rem;
  }

  li {
    margin-bottom: 0.5rem;
  }

  @media (max-width: ${bp.medium}px) {
    p {
      line-height: 1.6rem !important;
    }
  }
`;

const Post: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "post" });

  const { artistId, postId } = useParams();
  const { data: artist } = useArtistQuery();
  const { data: post, isLoading } = useQuery(
    queryPost({ postId: postId ?? "", artistId: artistId ?? "" })
  );

  if (!post) {
    if (!isLoading) {
      return (
        <Box
          className={css`
            width: 100;
            text-align: center;
          `}
        >
          {t("noPostFound")}
          {artistId && (
            <Trans
              t={t}
              i18nKey="returnToArtist"
              values={{ artistName: artist?.name }}
              components={{
                link: <Link to={`/${artistId}`}>{artist?.name}</Link>,
              }}
            />
          )}
          .
        </Box>
      );
    }
    return <LoadingBlocks rows={1} />;
  }

  return (
    <div
      className={css`
        width: 100%;
        position: relative;
      `}
    >
      <MetaCard
        title={`${post.title} ${t("byArtist", { artist: post.artist?.name })}`}
        description={post.content.slice(0, 500)}
        image={post.featuredImage?.src}
      />
      <PostHeader post={post} />
      <PageMarkdownWrapper
        className={css`
          padding: 1rem !important;
        `}
      >
        {post.isContentHidden && (
          <div
            className={css`
              padding: 2rem 0;
            `}
          >
            {t("notAvailable")}
          </div>
        )}
        {!post.isContentHidden && (
          <MarkdownWrapper>{parse(post.content)}</MarkdownWrapper>
        )}
      </PageMarkdownWrapper>
      {post.artist && <SupportArtistPopUp artist={post.artist} />}
    </div>
  );
};

export default Post;
