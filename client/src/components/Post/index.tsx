import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import LazyIframe from "components/common/LazyIframe";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import { MetaCard } from "components/common/MetaCard";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import parse, { Element } from "html-react-parser";
import { queryPost } from "queries";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import useArtistQuery from "utils/useArtistQuery";
import { useTracksQuery } from "utils/useTracksQuery";

import PostHeader from "./PostHeader";
import PostTracksDock from "./PostTracksDock";

export const PageMarkdownWrapper = styled.div`
  width: 100%;
  font-size: 1.125rem;
  line-height: 1.75;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  blockquote {
    font-style: italic;
    border-left: 4px solid #d1d5db;
    padding-left: 1rem;
    margin: 1rem 0;
  }

  h2 {
    font-size: 1.7rem;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  p {
    line-height: 1.75;
    margin-bottom: 1rem;
  }

  ul,
  ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }

  li {
    margin-bottom: 0.5rem;
    line-height: 1.75;
  }

  iframe {
    margin: 1rem 0;
    line-height: 1.75;
  }

  @media (max-width: 768px) {
    p {
      line-height: 1.5;
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

  const trackIds = React.useMemo(
    () =>
      post && !post.isContentHidden
        ? (post.tracks?.map((pt) => pt.trackId) ?? [])
        : [],
    [post]
  );
  const { data: tracksData } = useTracksQuery(trackIds);

  if (!post) {
    if (!isLoading) {
      return (
        <Box className="w-full text-center">
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
      className={`w-full relative ${post.featuredImage ? "" : "bg-(--mi-tint-color)"}`}
    >
      <MetaCard
        title={`${post.title} ${t("byArtist", { artist: post.artist?.name })}`}
        description={post.content.slice(0, 500)}
        image={post.featuredImage?.src}
      />
      <PostHeader post={post} />

      <div
        className={
          post.featuredImage
            ? "max-w-3xl mx-auto px-4 pt-8"
            : "max-w-3xl mx-auto px-4 md:px-12 pt-4 pb-8 bg-(--mi-background-color)"
        }
      >
        <PageMarkdownWrapper>
          {post.isContentHidden && (
            <div className="py-8">
              <Trans
                t={t}
                i18nKey="notAvailable"
                components={{
                  support: (
                    <Link to={`/${post.artist?.urlSlug}/support`}></Link>
                  ),
                }}
              />
            </div>
          )}
          {!post.isContentHidden && (
            <MarkdownWrapper>
              {parse(post.content, {
                replace(node) {
                  if (node instanceof Element && node.tagName === "iframe") {
                    const { loading: _loading, ...attribs } = node.attribs;
                    return <LazyIframe {...attribs} />;
                  }
                },
              })}
            </MarkdownWrapper>
          )}
        </PageMarkdownWrapper>
      </div>
      {post.artist && (
        <SupportArtistPopUp
          artist={post.artist}
          prefaceText={t("likedThisPost")}
        />
      )}
      {!post.isContentHidden && tracksData && tracksData.length > 0 && (
        <PostTracksDock postId={post.id} tracks={tracksData} />
      )}
    </div>
  );
};

export default Post;
