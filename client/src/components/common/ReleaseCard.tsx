import { cx } from "@emotion/css";
import { determineItemLink } from "components/Artist/ArtistItemLink";
import ArtistLink from "components/Artist/ArtistLink";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import Thermometer from "components/TrackGroup/Thermometer";
import Wishlist from "components/TrackGroup/Wishlist";
import React, { useId } from "react";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { isTrackGroupPublished } from "utils/artist";

import PlayableCover, {
  buildCoverImage,
  playableCoverCardRevealClass,
} from "./PlayableCover";

/**
 * Grid card for a track group (album or single). Renders cover art with
 * {@link PlayableCover}, a title link, optional artist byline, fundraiser
 * thermometer, and purchase/wishlist overlay actions.
 *
 * @param trackGroup - The album or single to display.
 * @param showArtist - Whether to show the artist name below the title.
 * @param showWishlist - Whether to show the wishlist button for logged-in users.
 * @param headingLevel - Semantic heading level for the title link.
 * @param as - Root element type; defaults to `li` for list layouts.
 */
function ReleaseCard({
  trackGroup,
  showArtist,
  showWishlist = true,
  headingLevel,
  as,
}: React.PropsWithChildren<{
  trackGroup: TrackGroup;
  showArtist?: boolean;
  showWishlist?: boolean;
  headingLevel: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  as?: React.ElementType;
}>) {
  const goToId = useId();
  const bylineId = useId();
  const { user } = useAuthContext();
  const { t: tPlay } = useTranslation("translation", {
    keyPrefix: "playableCover",
  });
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const isPublished = isTrackGroupPublished(trackGroup);
  const isPrivateView = !trackGroup.isPublic && isPublished;

  if (isPrivateView && !user) {
    return null;
  }

  const isSingleTrackGroup = trackGroup.tracks?.length === 1;
  const trackIds = [...(trackGroup.tracks ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((t) => t.isPlayable)
    .map((t) => t.id);
  const linkUrl = determineItemLink(trackGroup.artist, trackGroup);
  const goToLabel = tPlay(isSingleTrackGroup ? "goToTrack" : "goToAlbum");
  const displayTitle = trackGroup.title?.length
    ? trackGroup.title
    : tPlay("untitled");
  const artistName = trackGroup.artist.name;
  const describedBy = [showArtist ? bylineId : "", goToId].join(" ");

  const Root = as ?? "li";
  const Heading = headingLevel;

  return (
    <Root
      className={cx(
        "flex min-w-0 w-full flex-col list-none cursor-pointer mb-4",
        "max-sm:text-(--mi-font-size-small)",
        playableCoverCardRevealClass
      )}
    >
      <div className="order-3 min-w-0 w-full pt-2">
        <Heading className="m-0! mb-0! pb-0! min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-normal leading-[1.375]! text-[calc(var(--mi-font-size-small)*var(--page-scale,1))]!">
          <Link
            to={linkUrl}
            aria-describedby={describedBy}
            className="text-(--mi-text-color)! no-underline! hover:underline! focus:outline-none"
          >
            {displayTitle}
          </Link>
        </Heading>
        <span id={bylineId} aria-hidden="true" className="hidden">
          {tPlay("byArtist", { artist: artistName })}.
        </span>
        {isPrivateView && (
          <span className="text-xs text-(--mi-normal-foreground-color) flex items-center gap-1 mt-1">
            <FaLock aria-hidden="true" />
            {t("onlyVisibleToYou")}
          </span>
        )}
      </div>
      {trackGroup.fundraiser && (
        <div className="order-2">
          <Thermometer
            goal={trackGroup.fundraiser.goalAmount ?? 0}
            trackGroupId={trackGroup.id}
            artist={trackGroup.artist}
            hideIfUnder10Percent
          />
        </div>
      )}
      <div
        className={cx(
          "order-1 relative w-full min-w-0",
          isPrivateView && "grayscale opacity-70"
        )}
      >
        <PlayableCover
          trackIds={trackIds}
          title={trackGroup.title ?? ""}
          image={buildCoverImage(trackGroup.cover?.sizes)}
          goToId={goToId}
          goToLabel={goToLabel}
          goToUrl={linkUrl}
          overlayActions={
            <>
              <PlayableCover.WideAction>
                <PurchaseOrDownloadAlbum trackGroup={trackGroup} collapse />
              </PlayableCover.WideAction>
              {user && showWishlist && (
                <PlayableCover.SquareAction>
                  <Wishlist trackGroup={trackGroup} />
                </PlayableCover.SquareAction>
              )}
            </>
          }
        />
      </div>
      {showArtist && (
        <div className="order-3 min-w-0 mt-[0.2rem]">
          <ArtistLink
            artist={trackGroup.artist}
            className="block overflow-hidden text-ellipsis whitespace-nowrap no-underline! hover:underline! focus-visible:outline-auto text-[calc(var(--mi-font-size-xsmall)*var(--page-scale,1))]"
          />
        </div>
      )}
    </Root>
  );
}

export default ReleaseCard;
