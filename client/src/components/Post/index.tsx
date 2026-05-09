import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import { MetaCard } from "components/common/MetaCard";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import PublicTrackGroupListing from "components/common/TrackTable/PublicTrackGroupListing";
import parse from "html-react-parser";
import { queryPost } from "queries";
import React, { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import useArtistQuery from "utils/useArtistQuery";
import { useTracksQuery } from "utils/useTracksQuery";

import PostHeader from "./PostHeader";

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

  // Fetch full track details if post has associated tracks
  const trackIds = useMemo(() => {
    return post?.tracks?.map((t) => t.trackId) ?? [];
  }, [post?.tracks]);

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
    <div className="w-full relative">
      <MetaCard
        title={`${post.title} ${t("byArtist", { artist: post.artist?.name })}`}
        description={post.content.slice(0, 500)}
        image={post.featuredImage?.src}
      />
      <PostHeader post={post} hasTracks={trackIds.length > 0} />

      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div
          className={`grid gap-8 ${trackIds.length > 0 ? "grid-cols-1 lg:grid-cols-[1fr_400px]" : "grid-cols-1"}`}
        >
          <div
            className={`${trackIds.length > 0 ? "lg:col-span-2" : "max-w-3xl mx-auto w-full"}`}
          ></div>
          <div
            className={trackIds.length > 0 ? "" : "max-w-3xl mx-auto w-full"}
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
                <MarkdownWrapper>{parse(post.content)}</MarkdownWrapper>
              )}
            </PageMarkdownWrapper>
          </div>
          {tracksData && tracksData.length > 0 && (
            <div className="lg:col-start-2">
              <PublicTrackGroupListing
                tracks={tracksData}
                trackGroup={tracksData[0]?.trackGroup}
                size="small"
              />
            </div>
          )}
        </div>
      </div>
      {post.artist && (
        <SupportArtistPopUp
          artist={post.artist}
          prefaceText={t("likedThisPost")}
        />
      )}
    </div>
  );
};

export default Post;
