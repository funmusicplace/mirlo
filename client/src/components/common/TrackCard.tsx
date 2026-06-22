import { cx } from "@emotion/css";
import { determineItemLink } from "components/Artist/ArtistItemLink";
import ArtistLink from "components/Artist/ArtistLink";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import WishlistTrack from "components/TrackGroup/WishlistTrack";
import React, { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import PlayableCover, {
  buildCoverImage,
  playableCoverCardRevealClass,
} from "./PlayableCover";

/**
 * Grid card for an individual track. Renders cover art with
 * {@link PlayableCover}, a title link, optional artist byline, and
 * purchase/wishlist overlay actions.
 *
 * @param track - The track to display (includes its parent `trackGroup`).
 * @param showArtist - Whether to show the artist name below the title.
 * @param showTrackWishlist - Whether to show the per-track wishlist button.
 * @param headingLevel - Semantic heading level for the title link.
 * @param as - Root element type; defaults to `li` for list layouts.
 */
function TrackCard({
  track,
  showArtist,
  showTrackWishlist,
  headingLevel,
  as,
}: React.PropsWithChildren<{
  track: Track;
  showArtist?: boolean;
  showTrackWishlist?: boolean;
  headingLevel: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  as?: React.ElementType;
}>) {
  const { trackGroup } = track;
  const goToId = useId();
  const bylineId = useId();
  const { t: tPlay } = useTranslation("translation", {
    keyPrefix: "playableCover",
  });
  const linkUrl = determineItemLink(trackGroup.artist, {
    ...track,
    trackGroup,
  });
  const goToLabel = tPlay("goToTrack");
  const trackIds = track.isPlayable === false ? [] : [track.id];
  const displayTitle = track.title?.length ? track.title : tPlay("untitled");
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
      </div>
      <div className="order-1 relative w-full min-w-0">
        <PlayableCover
          trackIds={trackIds}
          title={track.title ?? ""}
          image={buildCoverImage(trackGroup.cover?.sizes)}
          goToId={goToId}
          goToLabel={goToLabel}
          goToUrl={linkUrl}
          overlayActions={
            <>
              <PlayableCover.WideAction>
                <PurchaseOrDownloadAlbum trackGroup={trackGroup} collapse />
              </PlayableCover.WideAction>
              {showTrackWishlist && (
                <PlayableCover.SquareAction>
                  <WishlistTrack track={track} collapse />
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

export default TrackCard;
