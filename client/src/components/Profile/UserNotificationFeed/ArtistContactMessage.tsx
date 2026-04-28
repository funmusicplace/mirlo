import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";

const ArtistContactMessage: React.FC<{
  notification: Notification;
  compact?: boolean;
}> = ({ notification, compact }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });
  if (!notification.relatedUser) {
    return null;
  }

  const senderName =
    notification.relatedUser?.name ?? notification.relatedUser?.email;

  return (
    <div
      className={
        compact
          ? "flex items-start gap-2.5 py-2 px-3"
          : "flex items-start gap-3.5 py-3.5 px-4"
      }
    >
      <div
        className={
          compact
            ? "w-7 h-7 rounded-full shrink-0 bg-(--mi-pink) flex items-center justify-center font-bold text-xs text-white"
            : "w-11 h-11 rounded-full shrink-0 bg-(--mi-pink) flex items-center justify-center font-bold text-base text-white"
        }
      >
        {(senderName?.[0] ?? "?").toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-(--mi-pink) mb-1">
            {t("newMessage")}
          </div>
        )}
        <div
          className={
            compact
              ? "text-xs text-(--mi-text-color) leading-snug"
              : "text-sm text-(--mi-text-color)"
          }
        >
          <strong>{senderName}</strong> {t("sentYouAMessage")}
          {notification.artist && (
            <>
              {": "}
              <Link to={getArtistUrl(notification.artist)}>
                {notification.artist.name}
              </Link>
            </>
          )}
        </div>
        {notification.content && !compact && (
          <p className="text-sm text-(--mi-text-color) whitespace-pre-wrap mt-1">
            {notification.content}
          </p>
        )}
        <div className="text-xs text-(--mi-light-foreground-color) mt-0.5">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
        </div>
      </div>
    </div>
  );
};

export default ArtistContactMessage;
