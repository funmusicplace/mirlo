import styled from "@emotion/styled";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import WishlistTrack from "components/TrackGroup/WishlistTrack";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
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

const TR = styled.tr<{
  canPlayTrack: boolean;
  isPlaying: boolean;
}>`
  ${(props) =>
    !props.canPlayTrack ? `color: var(--mi-contrast-color); opacity: .6;` : ""}

  ${(props) => (props.isPlaying ? `font-weight: 600;` : "")}

  &:hover {
    background-color: var(--mi-tint-x-color);
  }
`;

const licenseSpanClass =
  "whitespace-nowrap max-w-16 block text-ellipsis overflow-hidden";

const PlayCell: React.FC<{
  track: Track;
  canPlayTrack: boolean;
  addTracksToQueue: (id: number) => void;
  onTrackPlay: () => void;
  inWidget?: boolean;
  compact?: boolean;
}> = ({
  track,
  canPlayTrack,
  addTracksToQueue,
  onTrackPlay,
  inWidget,
  compact,
}) => (
  <td
    onClick={onTrackPlay}
    className={
      inWidget
        ? "pl-4! pr-2! py-0.5! w-10"
        : `${compact ? "h-7 w-7 align-middle" : "w-8 py-1 align-top"} max-sm:px-1 max-sm:py-0.5`
    }
  >
    <TrackRowPlayControl
      trackId={track.id}
      canPlayTrack={canPlayTrack}
      trackNumber={track.order}
      onTrackPlayCallback={addTracksToQueue}
      inWidget={inWidget}
      compact={compact}
    />
  </td>
);

const TitleCell: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  inWidget?: boolean;
  onTrackPlay: () => void;
  compact?: boolean;
}> = ({ track, trackGroup, inWidget, onTrackPlay, compact }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  return (
    <td
      onClick={onTrackPlay}
      className={
        inWidget
          ? "w-full p-0! pr-4! py-0.5! m-0 leading-6"
          : `w-full m-0 ${compact ? "p-0 leading-6 text-sm" : "px-0 py-1 leading-8 align-top"} max-sm:px-1 max-sm:py-0.5`
      }
    >
      <div
        className={`flex justify-between ${
          inWidget ? "items-center min-w-0 overflow-hidden" : "items-start"
        }`}
      >
        <div
          className={`overflow-hidden text-ellipsis mr-1 grow [&_i]:opacity-80 ${
            inWidget
              ? "whitespace-nowrap break-normal min-w-0 text-xs"
              : compact
                ? "text-sm py-1.5"
                : "max-md:text-sm"
          }`}
        >
          {track.title ?? <i>{t("untitled")}</i>}
          <TrackAuthors
            track={track}
            trackGroupArtistId={trackGroup.artistId}
          />
        </div>

        <div
          className={`max-md:ml-1 ${
            inWidget
              ? "text-xs leading-6"
              : compact
                ? "text-sm"
                : "text-sm leading-8 max-md:text-xs max-md:font-bold"
          }`}
        >
          {track.audio?.duration && fmtMSS(track.audio.duration)}
        </div>
      </div>
    </td>
  );
};

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

const DropdownCell: React.FC<{
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
    <td className="text-right py-1 align-top">
      <div className="flex items-center justify-end h-8">
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
      </div>
    </td>
  );
};

const TrackRow: React.FC<{
  showDropdown?: boolean;
  track: Track;
  trackGroup: TrackGroup;
  addTracksToQueue: (id: number) => void;
  size?: "small" | "compact";
  inWidget?: boolean;
}> = ({
  track,
  addTracksToQueue,
  trackGroup,
  size,
  showDropdown,
  inWidget,
}) => {
  const {
    state: { playerQueueIds, playing, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const { user } = useAuthContext();

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);
  const embeddedInMirlo = isEmbeddedInMirlo();
  const sendPlayerRequest = usePlayerSyncRequest();
  const showDropdownCell =
    size !== "small" && size !== "compact" && showDropdown;
  const isCompact = size === "compact";
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
    <TR
      key={track.id}
      id={`${track.id}`}
      canPlayTrack={canPlayTrack}
      isPlaying={!!isThisTrackPlaying}
      className={`group ${canPlayTrack ? "cursor-pointer" : ""} ${
        inWidget
          ? "[&:not(:first-of-type)>td]:border-t [&:not(:first-of-type)>td]:border-current/15 text-xs"
          : ""
      }`}
    >
      <PlayCell
        track={track}
        canPlayTrack={canPlayTrack}
        addTracksToQueue={addTracksToQueue}
        onTrackPlay={onTrackPlay}
        inWidget={inWidget}
        compact={isCompact}
      />
      <TitleCell
        track={track}
        trackGroup={trackGroup}
        inWidget={inWidget}
        onTrackPlay={onTrackPlay}
        compact={isCompact}
      />

      {showDropdownCell && (
        <DropdownCell track={track} trackGroup={trackGroup} user={user} />
      )}
    </TR>
  );
};
export default TrackRow;
