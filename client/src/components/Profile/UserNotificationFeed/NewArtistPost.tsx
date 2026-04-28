import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistUrl, getPostURLReference } from "utils/artist";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";

const NewArtistPost: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });

  if (!notification.post) {
    return null;
  }

  const artist = notification.post.artist;
  const featuredImageSrc = notification.post.featuredImage?.src;
  const postUrl = getPostURLReference(notification.post);

  return (
    <Link to={postUrl} className="block no-underline! text-inherit">
      {featuredImageSrc && (
        <div className="relative w-full h-40 overflow-hidden">
          <img
            src={featuredImageSrc}
            alt=""
            className="w-full h-full object-cover block"
          />
          <span className="absolute top-2 left-2 text-xs font-bold uppercase tracking-[0.08em] bg-black/45 text-white py-0.5 px-2 rounded backdrop-blur-sm">
            {t("newPost")}
          </span>
        </div>
      )}
      <div className="py-3 px-4">
        {!featuredImageSrc && (
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-(--mi-info-background-color) mb-1">
            {t("newPost")}
          </div>
        )}
        <div className="text-sm font-semibold mb-1 text-(--mi-text-color)">
          {notification.post.title}
        </div>
        {notification.post.content && (
          <div className="text-xs text-(--mi-light-foreground-color) leading-snug line-clamp-2 mb-1.5">
            {notification.post.content.replace(/<[^>]*>/g, "")}
          </div>
        )}
        {artist && (
          <div className="text-xs text-(--mi-light-foreground-color)">
            <span>{t("by")} </span>
            <Link
              to={getArtistUrl(artist)}
              onClick={(e) => e.stopPropagation()}
            >
              {artist.name}
            </Link>
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-(--mi-light-foreground-color)">
            {formatRelativeTime({ date: notification.createdAt, i18n })}
          </div>
          <span className="text-xs font-semibold text-(--mi-text-color) opacity-70">
            {t("readPost")} →
          </span>
        </div>
      </div>
    </Link>
  );
};

export default NewArtistPost;
