import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistUrl, getReleaseUrl } from "utils/artist";
import ClickToPlay from "components/common/ClickToPlay";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";

const NewArtistAlbum: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });

  if (!notification.trackGroup) {
    return null;
  }

  const { trackGroup } = notification;
  const coverUrl = trackGroup.cover?.sizes?.[300] ?? "";

  return (
    <div className="flex items-center gap-4 p-4 min-h-[200px] relative">
      <div className="shrink-0 w-40">
        <ClickToPlay
          trackGroup={trackGroup as any}
          trackIds={
            (trackGroup as any).tracks
              ?.filter((t: any) => t.isPreview)
              .map((t: any) => t.id) ?? []
          }
          title={trackGroup.title ?? ""}
          image={{ width: 160, height: 160, url: coverUrl }}
          showWishlist
          compact
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#BE3455] mb-1">
          {t("newRelease")}
        </div>
        <div className="text-sm font-semibold truncate text-(--mi-normal-foreground-color)">
          {trackGroup.title}
        </div>
        <div className="text-xs text-(--mi-light-foreground-color) mt-0.5">
          {t("newReleaseCount", {
            count: (trackGroup as any).tracks?.length ?? 0,
          })}{" "}
          {t("by")}{" "}
          {trackGroup.artist ? (
            <Link to={getArtistUrl(trackGroup.artist)} className="underline">
              {trackGroup.artist.name}
            </Link>
          ) : (
            <strong>{trackGroup.title}</strong>
          )}
        </div>
        <div className="text-xs text-(--mi-light-foreground-color) mt-1.5">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
        </div>
      </div>
      {trackGroup.artist && (
        <Link
          to={getReleaseUrl(trackGroup.artist, trackGroup)}
          className="absolute bottom-3 right-4 text-xs font-semibold text-(--mi-normal-foreground-color) no-underline opacity-70 hover:opacity-100"
        >
          {t("goToRelease")} →
        </Link>
      )}
    </div>
  );
};

export default NewArtistAlbum;
