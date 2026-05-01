import styled from "@emotion/styled";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import FavoriteTrack from "components/TrackGroup/Favorite";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
import { usePlayerSyncRequest } from "utils/playerSync";
import { fmtMSS, isTrackOwnedOrPreview } from "utils/tracks";
import { isEmbeddedInMirlo } from "utils/widgetContext";

import { bp } from "../../../constants";
import DropdownMenu from "../DropdownMenu";
import Tooltip from "../Tooltip";

import EmbedLink from "./EmbedLink";
import LyricsModal from "./LyricsModal";
import TrackAuthors from "./TrackAuthors";
import TrackLink from "./TrackLink";
import TrackRowPlayControl from "./TrackRowPlayControl";

const TR = styled.tr<{
  canPlayTrack: boolean;
  inWidget?: boolean;
}>`
  ${(props) =>
    !props.canPlayTrack ? `color: var(--mi-contrast-color); opacity: .6;` : ""}

  &:hover {
    background-color: var(--mi-tint-x-color);
  }

  button.play-button,
  button.pause-button {
    color: var(--mi-contrast-color);
    background: transparent;
    font-size: 0.8rem;

    svg {
      fill: var(--mi-contrast-color);
    }
  }

  > td {
    line-height: 2rem !important;
  }

  > td > .play-button {
    display: none;
  }
  > td > .track-number {
    display: block;
    width: 2rem;
    line-height: 2rem !important;
  }
  &:hover > td > .play-button,
  &:hover > td > .pause-button {
    display: flex;
  }
  ${(props) =>
    props.canPlayTrack
      ? `&:hover > td > .track-number {
          display: none;
        }`
      : ""}

  @media screen and (max-width: ${bp.small}px) {
    td {
      padding: 0.15rem 0.3rem;
    }
    button.play-button,
    button.pause-button {
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      svg {
        width: 0.9rem;
        height: 0.9rem;
      }
    }
  }

  ${(props) =>
    props.inWidget &&
    `
    font-size: 0.75rem;
    &:not(:first-of-type) > td {
      border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    }
    > td {
      line-height: 1.5rem !important;
      padding: 0 !important;
    }
    > td:first-of-type {
      padding-left: 1rem !important;
    }
    > td:last-of-type {
      padding-right: 1rem !important;
    }
    > td > .track-number {
      width: auto;
      line-height: 1.5rem !important;
      text-align: left !important;
    }
    button.play-button,
    button.pause-button {
      width: 1.5rem !important;
      height: 1.5rem !important;
      padding: 0 !important;
      font-size: 0.7rem !important;
      justify-content: flex-start !important;
      .startIcon {
        justify-content: flex-start !important;
      }
    }
    @media screen and (max-width: ${bp.small}px) {
      button.play-button,
      button.pause-button {
        width: 1.25rem !important;
        height: 1.25rem !important;
        font-size: 0.6rem !important;
        svg {
          width: 0.7rem !important;
          height: 0.7rem !important;
        }
      }
    }
  `}
`;

const licenseSpanClass =
  "whitespace-nowrap max-w-16 block text-ellipsis overflow-hidden";

const PlayCell: React.FC<{
  track: Track;
  canPlayTrack: boolean;
  addTracksToQueue: (id: number) => void;
  onTrackPlay: () => void;
}> = ({ track, canPlayTrack, addTracksToQueue, onTrackPlay }) => (
  <td
    onClick={onTrackPlay}
    className="h-[30px] w-8 [&_button]:bg-transparent [&_button:hover]:!bg-transparent"
  >
    <TrackRowPlayControl
      trackId={track.id}
      canPlayTrack={canPlayTrack}
      trackNumber={track.order}
      onTrackPlayCallback={addTracksToQueue}
    />
  </td>
);

const TitleCell: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  inWidget?: boolean;
  onTrackPlay: () => void;
}> = ({ track, trackGroup, inWidget, onTrackPlay }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  return (
    <td onClick={onTrackPlay} className="w-full p-0 m-0">
      <div
        className={`flex justify-between items-center ${
          inWidget ? "min-w-0 overflow-hidden" : ""
        }`}
      >
        <div
          className={`overflow-hidden text-ellipsis mr-1 grow [&_i]:opacity-80 max-md:text-sm ${
            inWidget ? "whitespace-nowrap break-normal min-w-0 !text-xs" : ""
          }`}
        >
          {track.title ?? <i>{t("untitled")}</i>}
          <TrackAuthors
            track={track}
            trackGroupArtistId={trackGroup.artistId}
          />
        </div>

        <div
          className={`text-sm max-md:text-xs max-md:font-bold max-md:ml-1 ${
            inWidget ? "!text-xs max-sm:!text-[0.6rem]" : ""
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
    <td className="text-right">
      <DropdownMenu smallIcon compact label="Track options">
        <ul>
          <li>
            <EmbedLink track={track} />
          </li>
          <li>
            <TrackLink
              track={track}
              trackGroup={trackGroup}
              artist={trackGroup.artist}
            />
          </li>
          <li>
            <FavoriteTrack track={track} />
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
    </td>
  );
};

const TrackRow: React.FC<{
  showDropdown?: boolean;
  track: Track;
  trackGroup: TrackGroup;
  addTracksToQueue: (id: number) => void;
  size?: "small";
  inWidget?: boolean;
}> = ({
  track,
  addTracksToQueue,
  trackGroup,
  size,
  showDropdown,
  inWidget,
}) => {
  const { dispatch } = useGlobalStateContext();
  const { user } = useAuthContext();

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);
  const embeddedInMirlo = isEmbeddedInMirlo();
  const sendPlayerRequest = usePlayerSyncRequest();
  const showDropdownCell = size !== "small" && showDropdown;

  const onTrackPlay = React.useCallback(() => {
    if (!canPlayTrack) return;
    if (embeddedInMirlo) {
      sendPlayerRequest({ type: "play", trackId: track.id });
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
  ]);

  return (
    <TR
      key={track.id}
      id={`${track.id}`}
      canPlayTrack={canPlayTrack}
      inWidget={inWidget}
    >
      <PlayCell
        track={track}
        canPlayTrack={canPlayTrack}
        addTracksToQueue={addTracksToQueue}
        onTrackPlay={onTrackPlay}
      />
      <TitleCell
        track={track}
        trackGroup={trackGroup}
        inWidget={inWidget}
        onTrackPlay={onTrackPlay}
      />

      {showDropdownCell && (
        <DropdownCell track={track} trackGroup={trackGroup} user={user} />
      )}
    </TR>
  );
};
export default TrackRow;
