import { css } from "@emotion/css";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPlay } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { getArtistUrl, getPostURLReference } from "utils/artist";
import { useLinkContainer } from "utils/useLinkContainer";

const cardStyle = css`
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  width: 100%;
  min-height: 180px;
  max-height: 360px;
  overflow: hidden;
  cursor: pointer;
  background: var(--mi-button-tint-color);
  border: 1px solid var(--mi-tint-color);

  &:focus-within {
    outline: 1px solid var(--mi-text-color);
  }
`;

const PostCard: React.FC<{
  post: Post;
}> = ({ post }) => {
  const postUrl = getPostURLReference(post);
  const postContainerProps = useLinkContainer({ to: postUrl });
  const { t, i18n } = useTranslation("translation", { keyPrefix: "post" });

  const { artistId } = useParams();
  const isOnArtistPage = !!artistId;

  const featuredImageSrc = post.featuredImage?.src;
  const excerpt = post.content?.replace(/<[^>]*>/g, "").trim();
  const trackCount = post.trackCount ?? post.tracks?.length ?? 0;
  const hasTracks = trackCount > 0;

  return (
    <li {...postContainerProps} className={cardStyle}>
      {featuredImageSrc && (
        <div className="relative w-full h-40 overflow-hidden">
          <img
            src={featuredImageSrc}
            alt=""
            className="block w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex flex-col flex-1 gap-1 py-3 px-4">
        <h3 className="text-base font-semibold text-(--mi-text-color) line-clamp-2 leading-snug!">
          <Link to={postUrl} className="no-underline! text-inherit!">
            {post.title}
          </Link>
        </h3>
        {hasTracks && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded bg-(--mi-button-color) text-(--mi-button-text-color) text-xs ${
              excerpt ? "mt-2" : "my-auto"
            }`}
          >
            <FaPlay className="shrink-0 w-2.5 h-2.5" aria-hidden />
            <span className="truncate">
              {t("tracksInPost", { count: trackCount })}
            </span>
          </div>
        )}
        {excerpt && (
          <div
            className={`text-xs text-(--mi-text-color) leading-snug ${
              featuredImageSrc ? "line-clamp-2" : "line-clamp-[11] mt-3"
            }`}
          >
            {excerpt}
          </div>
        )}
      </div>
      <div className="px-4">
        <div className="flex flex-col gap-1 py-2.5 border-t border-(--mi-tint-color)">
          {post.artist && !isOnArtistPage && (
            <div className="text-xs text-(--mi-secondary-text-color)">
              {t("postByPrefix")}{" "}
              <Link to={getArtistUrl(post.artist)}>{post.artist.name}</Link>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-xs text-(--mi-secondary-text-color) uppercase">
              {formatDate({
                date: post.publishedAt,
                i18n,
                options: {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                },
              })}
            </div>
            <span className="text-xs font-semibold text-(--mi-text-color) opacity-70">
              {t("readPost")} →
            </span>
          </div>
        </div>
      </div>
    </li>
  );
};

export default PostCard;
