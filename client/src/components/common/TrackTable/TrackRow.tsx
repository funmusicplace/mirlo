import { css } from "@emotion/css";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

import { fmtMSS, isTrackOwnedOrPreview } from "utils/tracks";
import { bp } from "../../../constants";
import TrackRowPlayControl from "./TrackRowPlayControl";
import { useAuthContext } from "state/AuthContext";
import styled from "@emotion/styled";
import Tooltip from "../Tooltip";
import TrackAuthors from "./TrackAuthors";
import EmbedLink from "./EmbedLink";
import TrackLink from "./TrackLink";
import DropdownMenu from "../DropdownMenu";
import LyricsModal from "./LyricsModal";

const LicenseSpan = styled.a`
  text-wrap: nowrap;
  max-width: 4rem;
  display: block;
  overflow: ellipsis;
  text-overflow: ellipsis;
  overflow: hidden;
`;

const TR = styled.tr<{ canPlayTrack: boolean }>`
  ${(props) =>
    !props.canPlayTrack
      ? `color: var(--mi-normal-foreground-color); opacity: .3;`
      : ""}

  &:hover {
    color: var(--mi-normal-background-color) !important;
    ${(props) =>
      !props.canPlayTrack
        ? `background-color: var(--mi-normal-foreground-color);`
        : `background-color: var(--mi-normal-foreground-color) !important;`}

    button.play-button {
      color: var(--mi-normal-background-color);
      background: transparent;
    }

    .mi-dropdown-button {
      background-color: var(--mi-primary-color);
      color: var(--mi-secondary-color);
    }
  }

  button.play-button {
    color: var(--mi-normal-foreground-color);
    background: transparent;
    font-size: 0.8rem;

    &:hover {
      color: var(--mi-normal-background-color) !important;
      background: transparent;
    }
  }

  > td > .play-button {
    display: none;
  }
  > td > .track-number {
    display: block;
  }
  &:hover > td > .play-button {
    display: block;
    width: 2rem;
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
    span {
      width: 1rem !important;
      margin-right: 1rem !important;
    }
    > td > .play-button {
      margin-left: 0.5rem;
    }
    > td > .track-number {
      margin-left: 0.5rem;
    }
  }
`;

const FirstTD = styled.td`
  height: 30px;

  button {
    background: none;
  }
  button:hover {
    background: none !important;
  }
  @media screen and (max-width: ${bp.small}px) {
    button {
      background: none;
    }
    button:hover {
      background: none !important;
    }
  }
`;

const TrackTitleTD = styled.td`
  width: 100%;
  padding: 0rem;
  margin: 0rem;
`;

const TrackRow: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  addTracksToQueue: (id: number) => void;
  size?: "small";
}> = ({ track, addTracksToQueue, trackGroup, size }) => {
  const { dispatch } = useGlobalStateContext();
  const [trackTitle] = React.useState(track.title);
  const { user } = useAuthContext();

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);

  const onTrackPlay = React.useCallback(() => {
    if (canPlayTrack) {
      addTracksToQueue?.(track.id);
      dispatch({ type: "setPlaying", playing: true });
    }
  }, [addTracksToQueue, canPlayTrack, dispatch, track.id]);

  return (
    <TR
      key={track.id}
      id={`${track.id}`}
      onClick={onTrackPlay}
      canPlayTrack={canPlayTrack}
    >
      <FirstTD>
        <TrackRowPlayControl
          trackId={track.id}
          canPlayTrack={canPlayTrack}
          trackNumber={track.order}
          onTrackPlayCallback={addTracksToQueue}
        />
      </FirstTD>
      <TrackTitleTD>
        <div
          className={css`
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            padding: 0.1rem;
            margin-bottom: 0rem;
            justify-content: space-between;
            align-items: center;

            &:hover {
              cursor: pointer;
            }

            @media screen and (max-width: ${bp.small}px) {
              flex-wrap: nowrap;
            }
          `}
        >
          <div
            className={css`
              overflow: hidden;
              text-overflow: ellipsis;

              @media screen and (max-width: ${bp.medium}px) {
                font-size: 0.9rem;
              }

              @media screen and (max-width: ${bp.small}px) {
                td {
                  padding: 0.15rem 0.3rem;
                }
              }
            `}
          >
            {trackTitle}
            <TrackAuthors
              track={track}
              trackGroupArtistId={trackGroup.artistId}
            />
          </div>

          <div
            className={css`
              font-size: 0.9rem;
              @media screen and (max-width: ${bp.medium}px) {
                font-size: 0.7rem;
                font-weight: bold;
                margin-left: 0.2rem;
                td {
                  padding: 0.15rem 0.3rem;
                }
              }
            `}
          >
            {track.audio?.duration && fmtMSS(track.audio.duration)}
          </div>
        </div>
      </TrackTitleTD>

      {/* <td align="right">
        <TrackLink
          track={track}
          trackGroup={trackGroup}
          artist={trackGroup.artist}
        />
      </td> */}
      {size !== "small" && (
        <td align="right">
          <DropdownMenu compact>
            <>
              <EmbedLink track={track} />
              <TrackLink
                track={track}
                trackGroup={trackGroup}
                artist={trackGroup.artist}
              />
              {track.lyrics && <LyricsModal track={track} />}
            </>
          </DropdownMenu>
        </td>
      )}
      {size !== "small" &&
        track.license &&
        track.license?.short !== "copyright" && (
          <td>
            <Tooltip hoverText={track.license.name}>
              {track.license.link && (
                <LicenseSpan
                  as="a"
                  target="_blank"
                  href={track.license.link}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className={css`
                    overflow: ellipsis;
                  `}
                >
                  {track.license.short}
                </LicenseSpan>
              )}
              {!track.license.link && (
                <LicenseSpan as="span">{track.license.short}</LicenseSpan>
              )}
            </Tooltip>
          </td>
        )}
    </TR>
  );
};
export default TrackRow;
