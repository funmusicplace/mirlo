import { css, cx } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useGlobalStateContext } from "state/GlobalState";

import ImageWithPlaceholder from "./ImageWithPlaceholder";
import PauseButton from "./PauseButton";
import PlayButton from "./PlayButton";
import { PlayingMusicBars } from "./PlayingMusicBars";

const coverContainerName = "playable-cover";
const coverShowWideMinWidth = "160px";
const coverLargeMinWidth = "240px";

/**
 * Builds an image descriptor for {@link PlayableCover} from API cover size URLs.
 *
 * @param coverSizes - Map of pixel width to image URL (typically 300 and 600).
 */
export function buildCoverImage(coverSizes?: { [key: number]: string }) {
  const srcSet = coverSizes
    ? [300, 600]
        .filter((w) => coverSizes[w])
        .map((w) => `${coverSizes[w]} ${w}w`)
        .join(", ")
    : undefined;

  return {
    width: 600,
    height: 600,
    url: coverSizes?.[600] ?? coverSizes?.[300] ?? "",
    srcSet,
    sizes: "100cqw",
  };
}

/**
 * CSS class that reveals a {@link PlayableCover} overlay on hover/focus-within.
 * Apply to the card wrapper (e.g. {@link ReleaseCard}, {@link TrackCard}) so the
 * overlay appears when the pointer is anywhere on the card, not only the image.
 */
export const playableCoverCardRevealClass = css`
  &:hover [data-playable-overlay],
  &:focus-within [data-playable-overlay] {
    opacity: 1 !important;
    background-color: rgba(0, 0, 0, 0.25) !important;
  }

  &:has(a:focus-visible[aria-describedby]) .go-to-faux {
    outline: auto;
  }
`;

const wideActionClass = css`
  flex: 1 1 0;
  min-width: 0;

  > div {
    min-width: 0;
    width: 100%;
  }

  button {
    width: 100%;
    min-width: 0;

    .children {
      flex: 1 1 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
  }
`;

const squareActionClass = css`
  flex: 0 0 auto;

  button {
    padding: 0 !important;
    flex: 0 0 auto;
  }
`;

/**
 * Slot for wide overlay actions (purchase/download, etc.) that grow to fill
 * available space at larger cover widths. Use as `PlayableCover.WideAction`.
 */
function WideAction({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div data-playable-wide-action className={cx(wideActionClass, className)}>
      {children}
    </div>
  );
}

/**
 * Slot for compact square overlay actions (wishlist, etc.). Use as
 * `PlayableCover.SquareAction`.
 */
function SquareAction({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      data-playable-square-action
      className={cx(squareActionClass, className)}
    >
      {children}
    </div>
  );
}

const coverRootClass = css`
  .startIcon {
    font-size: 1.2rem !important;
    line-height: 1rem !important;

    svg {
      fill: white !important;
    }
  }

  .go-to-faux {
    font-size: var(--mi-font-size-xsmall);
  }

  .overlay-actions [data-playable-wide-action] {
    display: none;
  }

  .overlay-actions [data-playable-wide-action] button {
    height: 2rem;
    font-size: 1rem;
  }

  .overlay-actions [data-playable-square-action] button,
  .overlay-actions button.play-button {
    width: 2rem !important;
    height: 2rem !important;
    min-width: 2rem;
    min-height: 2rem;
    font-size: 1.1rem;
  }

  @container ${coverContainerName} (min-width: ${coverShowWideMinWidth}) {
    .overlay-actions [data-playable-wide-action] {
      display: block;
    }
  }

  @container ${coverContainerName} (min-width: ${coverLargeMinWidth}) {
    .startIcon {
      font-size: 1.5rem !important;
      line-height: 1.3rem !important;
    }

    .go-to-faux {
      font-size: var(--mi-font-size-small);
    }

    .overlay-actions [data-playable-wide-action] button {
      height: 3rem;
    }

    .overlay-actions [data-playable-square-action] button,
    .overlay-actions button.play-button {
      width: 3rem !important;
      height: 3rem !important;
      min-width: 3rem;
      min-height: 3rem;
      font-size: 1.4rem;
    }
  }
`;

const coverHoverClass = css`
  &:hover [data-playable-overlay],
  &:focus-within [data-playable-overlay] {
    opacity: 1 !important;
    background-color: rgba(0, 0, 0, 0.25) !important;
  }
`;

const playWrapperClass = css`
  &:has(.overlay-actions button:hover) .go-to-link:hover .go-to-faux {
    background-color: rgba(0, 0, 0, 1) !important;
  }

  @media (pointer: coarse) {
    background-color: transparent;
    opacity: 1;
    justify-content: flex-end;
    align-items: flex-end;

    button:active {
      background-color: rgba(0, 0, 0, 0.7);
    }
  }
`;

const overlayActionsClass = css`
  isolation: isolate;

  button {
    font-weight: normal;
    text-transform: uppercase;
    border: var(--mi-border) !important;
  }

  > * {
    position: relative;
    z-index: 0;
  }

  > *:has(:focus-visible) {
    z-index: 1;
  }

  button.play-button {
    padding: 0 !important;
    flex: 0 0 auto;
  }
`;

/**
 * Cover art with a hover overlay: play/pause controls, optional action slots,
 * and a centered link to the release or track page.
 *
 * Compose overlay actions with compound subcomponents:
 *
 * ```tsx
 * <PlayableCover
 *   trackIds={trackIds}
 *   title={title}
 *   image={buildCoverImage(cover?.sizes)}
 *   goToId={goToId}
 *   goToLabel={t("goToAlbum")}
 *   goToUrl={linkUrl}
 *   overlayActions={
 *     <>
 *       <PlayableCover.WideAction>
 *         <PurchaseOrDownloadAlbum trackGroup={trackGroup} collapse />
 *       </PlayableCover.WideAction>
 *       <PlayableCover.SquareAction>
 *         <Wishlist trackGroup={trackGroup} />
 *       </PlayableCover.SquareAction>
 *     </>
 *   }
 * />
 * ```
 *
 * @param trackIds - Playable track IDs queued when the play button is clicked.
 * @param title - Alt text for the cover image.
 * @param image - Cover image descriptor from {@link buildCoverImage}.
 * @param goToId - `id` for the screen-reader-only "go to" label.
 * @param goToLabel - Visible overlay link text (e.g. "Go to album").
 * @param goToUrl - Destination for the overlay link.
 * @param overlayActions - Extra controls rendered in the overlay action bar.
 * @param className - Applied to the cover root element.
 */
function PlayableCover({
  trackIds,
  title,
  image,
  goToId,
  goToLabel,
  goToUrl,
  overlayActions,
  className,
}: React.PropsWithChildren<{
  trackIds: number[];
  title: string;
  image?: {
    width: number;
    height: number;
    url: string;
    srcSet?: string;
    sizes?: string;
  };
  goToId: string;
  goToLabel: string;
  goToUrl: string;
  overlayActions?: React.ReactNode;
  className?: string;
}>) {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();

  const { t } = useTranslation("translation", { keyPrefix: "playableCover" });
  const errorHandler = useErrorHandler();

  const onClickPlay = React.useCallback(async () => {
    try {
      dispatch({
        type: "startPlayingIds",
        playerQueueIds: trackIds,
      });
    } catch (e) {
      errorHandler(e, true);
    }
  }, [dispatch, trackIds, errorHandler]);

  const currentlyPlaying =
    playing &&
    currentlyPlayingIndex !== undefined &&
    trackIds.includes(playerQueueIds[currentlyPlayingIndex]);

  return (
    <div
      className={cx(
        "playable-cover @container/playable-cover relative w-full min-w-0 max-w-full",
        coverRootClass,
        coverHoverClass,
        className
      )}
    >
      <div
        data-playable-overlay
        className={cx(
          "absolute inset-0 z-4 flex flex-col opacity-0 transition-opacity duration-500",
          "border border-white/5 text-white bg-black/20",
          "[&_button]:text-[1.4rem] [&_button]:right-0 [&_button]:bottom-0 [&_button]:m-auto [&_button]:!rounded-none [&_button]:[border:var(--mi-border)]",
          playWrapperClass
        )}
      >
        <div
          role="group"
          aria-label={t("overlayActions")}
          className={cx(
            "overlay-actions absolute bottom-0 z-2 flex w-full justify-end",
            "[&_button]:!bg-black/80 [&_button]:!text-(--mi-button-text-color) [&_button_svg]:!fill-(--mi-button-text-color) [&_button:hover:not(:disabled)]:!bg-black/60",
            overlayActionsClass
          )}
        >
          {overlayActions}
          {!currentlyPlaying && trackIds.length > 0 && (
            <PlayButton className="[&_button]:!mr-0" onPlay={onClickPlay} />
          )}
          {currentlyPlaying && <PauseButton />}
        </div>

        <Link
          to={goToUrl}
          aria-hidden="true"
          tabIndex={-1}
          className="go-to-link absolute inset-0 z-1 block bg-transparent no-underline focus-visible:outline-auto pointer-coarse:hidden hover:[&_.go-to-faux]:!bg-black/60"
        >
          <span className="go-to-faux pointer-events-none absolute top-1/2 left-1/2 min-w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-(--mi-border-radius) bg-black p-2 text-center uppercase whitespace-nowrap text-white">
            {goToLabel}
          </span>
          {/* Some screenreaders spell out all caps text (even via CSS) instead of treating it as words, so we provide a non-uppercase version */}
          <span className="sr-only" id={goToId}>
            {goToLabel}
          </span>
        </Link>
      </div>

      {currentlyPlaying && <PlayingMusicBars />}
      {image && (
        <ImageWithPlaceholder
          src={image.url}
          srcSet={image.srcSet}
          sizes={image.sizes}
          alt={title}
          size={image.width}
          square
          objectFit="contain"
          className="image-container w-full max-w-full overflow-hidden [&_img]:block [&_img]:w-full! [&_img]:border [&_img]:border-white/5"
        />
      )}
    </div>
  );
}

PlayableCover.WideAction = WideAction;
PlayableCover.SquareAction = SquareAction;

type PlayableCoverComponent = typeof PlayableCover & {
  WideAction: typeof WideAction;
  SquareAction: typeof SquareAction;
};

export default PlayableCover as PlayableCoverComponent;
