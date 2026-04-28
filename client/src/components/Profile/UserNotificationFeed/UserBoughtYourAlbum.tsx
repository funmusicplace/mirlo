import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistUrl, getReleaseUrl } from "utils/artist";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";
import { moneyDisplay } from "components/common/Money";

const UserBoughtYourAlbum: React.FC<{
  notification: Notification;
  compact?: boolean;
}> = ({ notification, compact }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });

  if (!notification.trackGroup) {
    return null;
  }

  const coverUrl = notification.trackGroup.cover?.sizes?.[60];
  const releaseUrl = getReleaseUrl(
    notification.trackGroup.artist,
    notification.trackGroup
  );
  const buyerName =
    notification.relatedUser?.name ?? notification.relatedUser?.email;

  return (
    <div
      className={
        compact
          ? "flex items-start gap-2.5 py-2 px-3"
          : "flex items-start gap-3.5 py-3.5 px-4"
      }
    >
      <Link to={releaseUrl} className="shrink-0 block no-underline">
        {coverUrl ? (
          <ImageWithPlaceholder
            src={coverUrl}
            alt={notification.trackGroup.title ?? ""}
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
                ? "w-7 h-7 rounded bg-(--mi-blue-100) opacity-40"
                : "w-10 h-10 rounded bg-(--mi-blue-100) opacity-40"
            }
          />
        )}
      </Link>

      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-(--mi-info-background-color) mb-1">
            {t("purchaseTag")}
          </div>
        )}
        <div
          className={
            compact
              ? "text-xs text-(--mi-text-color) leading-snug truncate"
              : "text-sm text-(--mi-text-color) truncate"
          }
        >
          <strong>{buyerName}</strong> {t("bought")}{" "}
          <Link to={releaseUrl}>
            <strong>{notification.trackGroup.title}</strong>
          </Link>
        </div>
        {notification.trackGroup.artist && (
          <div className="text-xs text-(--mi-light-foreground-color) mt-0.5">
            <span>{t("by")} </span>
            <Link to={getArtistUrl(notification.trackGroup.artist)}>
              {notification.trackGroup.artist.name}
            </Link>
          </div>
        )}
        {notification.trackGroup.purchase?.transaction &&
          notification.trackGroup.purchase.transaction.amount > 0 && (
            <span
              className={
                compact
                  ? "inline-block text-xs font-semibold py-0 px-1.5 rounded-full bg-(--mi-blue-100) text-(--mi-blue-700) mt-0.5 whitespace-nowrap"
                  : "inline-block text-xs font-semibold py-0.5 px-2 rounded-full bg-(--mi-blue-100) text-(--mi-blue-700) mt-1 whitespace-nowrap"
              }
            >
              {moneyDisplay({
                amount:
                  notification.trackGroup.purchase.transaction.amount / 100,
                currency:
                  notification.trackGroup.purchase.transaction.currency.toUpperCase(),
              })}
            </span>
          )}
        <div className="text-xs text-(--mi-light-foreground-color) mt-0.5">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
        </div>
      </div>
    </div>
  );
};

export default UserBoughtYourAlbum;
