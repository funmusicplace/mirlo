import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getReleaseUrl } from "utils/artist";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";

const FundraiserPledge: React.FC<{
  notification: Notification;
  compact?: boolean;
}> = ({ notification, compact }) => {
  const { i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });

  const { trackGroup } = notification;
  const coverUrl = trackGroup?.cover?.sizes?.[60];
  const releaseUrl = trackGroup?.artist
    ? getReleaseUrl(trackGroup.artist, trackGroup)
    : undefined;

  return (
    <div
      className={
        compact
          ? "flex items-start gap-2.5 py-2 px-3"
          : "flex items-start gap-3.5 py-3.5 px-4"
      }
    >
      {releaseUrl && (
        <Link to={releaseUrl} className="shrink-0 block no-underline">
          {coverUrl ? (
            <ImageWithPlaceholder
              src={coverUrl}
              alt={trackGroup?.title ?? ""}
              size={compact ? 28 : 40}
              square
              objectFit="cover"
              className={
                compact ? "w-7 h-7 rounded block" : "w-10 h-10 rounded block"
              }
            />
          ) : (
            <div
              className={
                compact
                  ? "w-7 h-7 rounded bg-(--mi-green-100) opacity-40"
                  : "w-10 h-10 rounded bg-(--mi-green-100) opacity-40"
              }
            />
          )}
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <div
          className={
            compact
              ? "text-xs text-(--mi-text-color) leading-snug"
              : "text-sm text-(--mi-text-color)"
          }
        >
          {notification.content}
        </div>
        <div className="text-xs text-(--mi-light-foreground-color) mt-0.5">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
        </div>
      </div>
    </div>
  );
};

export default FundraiserPledge;
