import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getArtistManageUrl, getArtistUrl } from "utils/artist";

const LabelInvite: React.FC<{
  notification: Notification;
  compact?: boolean;
}> = ({ notification, compact }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });

  if (!notification.artist) {
    return null;
  }
  const labelArtist = notification?.relatedUser?.artists?.find(
    (a) => a.isLabelProfile
  );
  if (!labelArtist) {
    return null;
  }

  const avatarUrl = labelArtist.avatar?.sizes?.[60];

  return (
    <div
      className={
        compact
          ? "flex items-start gap-2.5 py-2 px-3"
          : "flex items-start gap-3.5 py-3.5 px-4"
      }
    >
      <Link
        to={getArtistUrl(labelArtist)}
        className="shrink-0 block no-underline"
      >
        {avatarUrl ? (
          <ImageWithPlaceholder
            src={avatarUrl}
            alt={labelArtist.name}
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
                ? "w-7 h-7 rounded bg-(--mi-neutral-500) flex items-center justify-center font-bold text-xs text-white"
                : "w-10 h-10 rounded bg-(--mi-neutral-500) flex items-center justify-center font-bold text-sm text-white"
            }
          >
            {(labelArtist.name?.[0] ?? "L").toUpperCase()}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-(--mi-neutral-500) mb-1">
            {t("labelTag")}
          </div>
        )}
        <div
          className={
            compact
              ? "text-xs text-(--mi-text-color) leading-snug"
              : "text-sm text-(--mi-text-color)"
          }
        >
          <Trans
            t={t}
            i18nKey="inviteToJoinLabel"
            values={{ labelName: labelArtist.name }}
            components={{
              labelLink: (
                <Link to={getArtistUrl(labelArtist)} className="font-bold" />
              ),
            }}
          />
        </div>
        <div
          className={
            compact
              ? "text-xs text-(--mi-text-color) leading-snug mt-0.5"
              : "text-sm text-(--mi-text-color) mt-1"
          }
        >
          {t("manageOnArtistPage")}
        </div>
        <Link
          to={getArtistManageUrl(notification.artist.id) + "/customize#labels"}
          title={notification.artist?.name}
          className={
            compact
              ? "flex items-center gap-1 max-w-full font-semibold text-xs mt-0.5"
              : "flex items-center gap-1 max-w-full font-semibold text-sm mt-0.5"
          }
        >
          <span className="truncate min-w-0">{notification.artist?.name}</span>
          <FaChevronRight className="shrink-0 text-xs" />
        </Link>
        <div className="text-xs text-(--mi-light-foreground-color) mt-0.5">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
        </div>
      </div>
    </div>
  );
};

export default LabelInvite;
