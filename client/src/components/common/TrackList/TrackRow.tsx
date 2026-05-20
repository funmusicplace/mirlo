import styled from "@emotion/styled";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import { PlayingMusicBars } from "components/common/PlayingMusicBars";
import WishlistTrack from "components/TrackGroup/WishlistTrack";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";
import { TfiControlPause } from "react-icons/tfi";
import { VscPlay } from "react-icons/vsc";
import { Link } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
import { getArtistUrl } from "utils/artist";
import { usePlayerSyncRequest } from "utils/playerSync";
import { fmtMSS, isTrackOwnedOrPreview } from "utils/tracks";
import { isEmbeddedInMirlo } from "utils/widgetContext";

import DropdownMenu from "../DropdownMenu";
import Tooltip from "../Tooltip";

import CopyTrackLink from "./CopyTrackLink";
import EmbedLink from "./EmbedLink";
import GoToTrack from "./GoToTrack";
import LyricsModal from "./LyricsModal";
import TrackAuthors from "./TrackAuthors";
import TrackRowPlayControl from "./TrackRowPlayControl";

type Variant = "default" | "compact" | "widget" | "dock";

const LI = styled.li<{
  canPlayTrack: boolean;
  isPlaying: boolean;
  variant: Variant;
}>`
  --track-row-lh: ${(p) => (p.variant === "default" ? "2rem" : "1.5rem")};

  @media (max-width: 768px) {
    --track-row-lh: ${(p) =>
      p.variant === "default"
        ? "1.75rem"
        : p.variant === "dock"
          ? "1.75rem"
          : "1.5rem"};
  }

  display: flex;
  align-items: flex-start;
  gap: ${(p) => (p.variant === "widget" ? "1.5rem" : "0.5rem")};
  line-height: var(--track-row-lh);
  transition: 0.25s background-color;
  padding: ${(p) =>
    p.variant === "widget"
      ? "0.125rem 1rem 0.125rem 1rem"
      : p.variant === "dock"
        ? "0.25rem 0.5rem 0.5rem"
        : p.variant === "compact"
          ? "0.125rem 0"
          : "0.25rem 0"};

  @media (max-width: 768px) {
    ${(p) => (p.variant === "dock" ? "padding: 0.5rem 0.5rem 0.75rem;" : "")}
  }

  & * {
    line-height: inherit;
  }

  ${(p) =>
    p.variant !== "dock"
      ? `
    & > :first-child {
      flex-shrink: 0;
      width: var(--track-row-lh);
      height: var(--track-row-lh);
      display: flex;
      align-items: center;
      justify-content: ${p.variant === "widget" ? "flex-start" : "center"};
    }
  `
      : ""}

  &:hover {
    background-color: var(--mi-tint-x-color);
  }

  ${(p) =>
    p.variant === "dock" && p.isPlaying
      ? `background-color: var(--mi-tint-x-color);`
      : ""}

  ${(p) =>
    !p.canPlayTrack ? `color: var(--mi-contrast-color); opacity: .6;` : ""}
  ${(p) => (p.isPlaying ? `font-weight: 600;` : "")}
`;

const licenseSpanClass =
  "whitespace-nowrap max-w-16 block text-ellipsis overflow-hidden";

const LicenseLabel: React.FC<{ license: NonNullable<Track["license"]> }> = ({
  license,
}) => (
  <Tooltip hoverText={license.name}>
    {license.link && (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={license.link}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={`${licenseSpanClass} text-sm text-right flex items-center gap-4 w-full`}
      >
        <span>{license.short}</span> <FaExternalLinkAlt />
      </a>
    )}
    {!license.link && <span className={licenseSpanClass}>{license.short}</span>}
  </Tooltip>
);

const TrackDropdown: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  user: LoggedInUser | null | undefined;
}> = ({ track, trackGroup, user }) => {
  const ownsTrack = !!user?.userTrackPurchases?.find(
    (p) => p.trackId === track.id
  );
  const ownsTrackGroup = !!user?.userTrackGroupPurchases?.find(
    (p) => p.trackGroupId === trackGroup.id
  );
  const isOwned = ownsTrack || ownsTrackGroup;
  const canDownloadTrack =
    isOwned && (!trackGroup.isPreorder || track.isPreview);
  const showLicense = track.license && track.license.short !== "copyright";

  return (
    <DropdownMenu smallIcon compact label="Track options">
      <ul>
        <li>
          <GoToTrack
            track={track}
            trackGroup={trackGroup}
            artist={trackGroup.artist}
          />
        </li>
        <li>
          <CopyTrackLink
            track={track}
            trackGroup={trackGroup}
            artist={trackGroup.artist}
          />
        </li>
        <li>
          <EmbedLink track={track} />
        </li>
        <li>
          <WishlistTrack track={track} />
        </li>
        {track.lyrics && (
          <li>
            <LyricsModal track={track} />
          </li>
        )}
        {canDownloadTrack && (
          <li>
            <DownloadAlbumButton
              track={track}
              trackGroup={trackGroup}
              dropdownItem
            />
          </li>
        )}
        {showLicense && track.license && (
          <li>
            <LicenseLabel license={track.license} />
          </li>
        )}
      </ul>
    </DropdownMenu>
  );
};

const TrackRow: React.FC<{
  showDropdown?: boolean;
  track: Track;
  trackGroup: TrackGroup;
  addTracksToQueue: (id: number) => void;
  size?: "small" | "compact" | "dock";
  inWidget?: boolean;
}> = ({
  track,
  addTracksToQueue,
  trackGroup,
  size,
  showDropdown,
  inWidget,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const {
    state: { playerQueueIds, playing, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const { user } = useAuthContext();

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);
  const embeddedInMirlo = isEmbeddedInMirlo();
  const sendPlayerRequest = usePlayerSyncRequest();
  const showDropdownCell =
    size !== "small" && size !== "compact" && size !== "dock" && showDropdown;
  const isCompact = size === "compact";
  const isDock = size === "dock";
  const variant: Variant = inWidget
    ? "widget"
    : isDock
      ? "dock"
      : isCompact
        ? "compact"
        : "default";
  const currentPlayingTrackId =
    currentlyPlayingIndex !== undefined
      ? playerQueueIds[currentlyPlayingIndex]
      : undefined;
  const isThisTrackPlaying = playing && currentPlayingTrackId === track.id;

  const onTrackPlay = React.useCallback(() => {
    if (!canPlayTrack) return;
    if (embeddedInMirlo) {
      sendPlayerRequest({
        type: isThisTrackPlaying ? "pause" : "play",
        trackId: track.id,
      });
    } else if (isThisTrackPlaying) {
      dispatch({ type: "setPlaying", playing: false });
    } else {
      addTracksToQueue?.(track.id);
      dispatch({ type: "setPlaying", playing: true });
    }
  }, [
    addTracksToQueue,
    canPlayTrack,
    dispatch,
    track.id,
    embeddedInMirlo,
    sendPlayerRequest,
    isThisTrackPlaying,
  ]);

  return (
    <LI
      id={`${track.id}`}
      canPlayTrack={canPlayTrack}
      isPlaying={!!isThisTrackPlaying}
      variant={variant}
      className={`group ${canPlayTrack ? "cursor-pointer" : ""} ${
        inWidget
          ? "[&:not(:first-of-type)]:border-t border-current/15 text-xs"
          : ""
      }`}
    >
      {!isDock && (
        <div onClick={onTrackPlay}>
          <TrackRowPlayControl
            trackId={track.id}
            canPlayTrack={canPlayTrack}
            trackNumber={track.order}
            onTrackPlayCallback={addTracksToQueue}
            inWidget={inWidget}
            compact={isCompact}
          />
        </div>
      )}

      {isDock && canPlayTrack && (
        <button
          type="button"
          onClick={onTrackPlay}
          aria-label={t(isThisTrackPlaying ? "pauseTrack" : "playTrack", {
            title: track.title ?? t("untitled"),
          })}
          className="sr-only focus-visible:not-sr-only focus-visible:flex focus-visible:items-center focus-visible:justify-center focus-visible:w-7 focus-visible:h-7 focus-visible:bg-(--mi-tint-x-color) focus-visible:rounded"
        >
          {isThisTrackPlaying ? <TfiControlPause /> : <VscPlay />}
        </button>
      )}

      <div
        onClick={onTrackPlay}
        className="flex-1 min-w-0 flex items-start justify-between gap-2"
      >
        {isDock ? (
          <div className="grow flex flex-col min-w-0 [&_i]:opacity-80">
            <span className="truncate text-xs max-md:text-sm leading-tight!">
              {isThisTrackPlaying && (
                <>
                  <PlayingMusicBars variant="inline" />
                  <span className="sr-only">{t("nowPlaying")} </span>
                </>
              )}
              {track.title ?? <i>{t("untitled")}</i>}
            </span>
            {trackGroup.artist?.name && (
              <span className="truncate text-[0.65rem] max-md:text-xs leading-tight! mt-1">
                {t("by")}{" "}
                <Link
                  to={getArtistUrl(trackGroup.artist)}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-(--mi-text-color)!"
                >
                  {trackGroup.artist.name}
                </Link>
              </span>
            )}
          </div>
        ) : (
          <div
            className={`overflow-hidden text-ellipsis grow [&_i]:opacity-80 ${
              inWidget
                ? "whitespace-nowrap break-normal min-w-0 text-xs"
                : isCompact
                  ? "text-sm"
                  : "max-md:text-sm"
            }`}
          >
            {track.title ?? <i>{t("untitled")}</i>}
            <TrackAuthors
              track={track}
              trackGroupArtistId={trackGroup.artistId}
            />
          </div>
        )}

        <div
          className={`shrink-0 ${
            inWidget
              ? "text-xs"
              : isDock
                ? "text-xs max-md:text-sm"
                : isCompact
                  ? "text-sm"
                  : "text-sm max-md:text-xs max-md:font-bold"
          }`}
        >
          {track.audio?.duration && fmtMSS(track.audio.duration)}
        </div>
      </div>

      {showDropdownCell && (
        <TrackDropdown track={track} trackGroup={trackGroup} user={user} />
      )}
    </LI>
  );
};
export default TrackRow;
