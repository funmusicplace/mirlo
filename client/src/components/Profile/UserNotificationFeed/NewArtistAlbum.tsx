import { cx } from "@emotion/css";
import PlayableCover, {
  buildCoverImage,
  playableCoverCardRevealClass,
} from "components/common/PlayableCover";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import Wishlist from "components/TrackGroup/Wishlist";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";
import React, { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistUrl, getReleaseUrl } from "utils/artist";
import { useAuthContext } from "state/AuthContext";

function NewArtistAlbum({ notification }: { notification: Notification }) {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });
  const { t: tPlay } = useTranslation("translation", {
    keyPrefix: "playableCover",
  });
  const { user } = useAuthContext();
  const goToId = useId();

  if (!notification.trackGroup?.artist) {
    return null;
  }

  const { trackGroup } = notification;
  const { artist } = trackGroup;
  const isPreorder = notification.notificationType === "NEW_ARTIST_PREORDER";
  const previewTrackIds = [...((trackGroup as TrackGroup).tracks ?? [])]
    .filter((t) => t.isPreview)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((t) => t.id);
  const releaseUrl = getReleaseUrl(artist, trackGroup);
  const goToLabel = tPlay("goToAlbum");

  return (
    <div
      className={cx(
        "flex items-center gap-4 p-4 min-h-[200px]",
        playableCoverCardRevealClass
      )}
    >
      <div className="order-2 flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-(--mi-pink) mb-1">
          {isPreorder ? t("availableForPreorder") : t("newRelease")}
        </div>
        <div className="text-sm font-semibold truncate">
          <Link
            to={releaseUrl}
            aria-describedby={goToId}
            className="text-(--mi-text-color)! font-semibold underline focus:outline-none"
          >
            {trackGroup.title}
          </Link>
        </div>
        <div className="metadata text-xs text-(--mi-light-foreground-color) mt-0.5">
          {t("newReleaseCount", {
            count: (trackGroup as TrackGroup).tracks?.length ?? 0,
          })}{" "}
          {t("by")}{" "}
          <Link
            to={getArtistUrl(artist)}
            className="underline focus-visible:outline-auto"
          >
            {artist.name}
          </Link>
        </div>
        <div className="text-xs text-(--mi-light-foreground-color) mt-1.5">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
        </div>
      </div>

      <div className="order-1 shrink-0 w-40">
        <PlayableCover
          trackIds={previewTrackIds}
          title={trackGroup.title ?? ""}
          image={buildCoverImage(trackGroup.cover?.sizes)}
          goToId={goToId}
          goToLabel={goToLabel}
          goToUrl={releaseUrl}
          overlayActions={
            <>
              <PlayableCover.WideAction>
                <PurchaseOrDownloadAlbum
                  trackGroup={trackGroup as TrackGroup}
                  collapse
                />
              </PlayableCover.WideAction>
              {user ? (
                <PlayableCover.SquareAction>
                  <Wishlist trackGroup={trackGroup as TrackGroup} />
                </PlayableCover.SquareAction>
              ) : null}
            </>
          }
        />
      </div>
    </div>
  );
}

export default NewArtistAlbum;
