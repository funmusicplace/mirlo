import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import LazyIframe from "components/common/LazyIframe";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import { MetaCard } from "components/common/MetaCard";
import { PageMarkdownWrapper } from "components/common/PageMarkdownWrapper";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import PostHeader from "components/Post/PostHeader";
import PostTracksDock from "components/Post/PostTracksDock";
import parse, { Element } from "html-react-parser";
import { queryPost } from "queries";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import useArtistQuery from "utils/useArtistQuery";
import { useTracksQuery } from "utils/useTracksQuery";

const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "post" });

  const { artistId, postId } = useParams();
  const { user } = useAuthContext();
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
    <div className="w-full relative bg-(--mi-darken-background-color) pb-12">
      <MetaCard
        title={`${post.title} ${t("byArtist", { artist: post.artist?.name })}`}
        description={post.content.slice(0, 500)}
        image={post.featuredImage?.src}
      />
      <PostHeader post={post} />

      <div
        className={`max-w-[824px] mx-auto px-4 md:px-12 pt-8 pb-8 md:pb-12 bg-(--mi-white) text-(--mi-black) ${
          post.featuredImage ? "md:rounded-b-lg" : "md:rounded-lg"
        }`}
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
      {post.artist &&
        !post.isContentHidden &&
        !user?.artistUserSubscriptions?.some(
          (sub) => sub.artistSubscriptionTier.artistId === post.artist?.id
        ) && (
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

export default Index;
