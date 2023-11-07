import { css } from "@emotion/css";
import React from "react";
import { FiLink } from "react-icons/fi";
import { useGlobalStateContext } from "state/GlobalState";

import IconButton from "./IconButton";
import { fmtMSS, isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";
import { useSnackbar } from "state/SnackbarContext";
import { bp } from "../../constants";
import TrackRowPlayControl from "./TrackRowPlayControl";

const TrackRow: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  addTracksToQueue: (id: number) => void;
}> = ({ track, addTracksToQueue, trackGroup }) => {
  const snackbar = useSnackbar();
  const [trackTitle] = React.useState(track.title);
  const {
    state: { user },
  } = useGlobalStateContext();

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);

  return (
    <tr
      key={track.id}
      id={`${track.id}`}
      className={css`
        ${!canPlayTrack ? `color: var(--mi-light-foreground-color);` : ""}

        button, button:hover {
          color: var(--mi-normal-foreground-color);
          background: transparent;
        }

        font-size: 18px;

        @media screen and (max-width: ${bp.small}px) {
          font-size: 16px;
          td {
            padding: 0.15rem 0.3rem;
          }
        }

        button {
          font-size: 14px;
        }

        > td > .play-button {
          display: none;
        }
        > td > .track-number {
          display: block;
        }
        &:hover > td > .play-button {
          display: block;
        }
        &:hover > td > .track-number {
          display: none;
        }
      `}
    >
      <td
        className={css`
          height: 30px;
          button {
            //* padding: .5rem;
            background: none;
          }
          }
        `}
      >
        {canPlayTrack && (
          <TrackRowPlayControl
            trackId={track.id}
            trackNumber={track.order}
            onTrackPlayCallback={addTracksToQueue}
          />
        )}
      </td>
      <td
      className={css`
        width:100%;
        padding: 0rem;
        margin: 0rem;
      `}
        >
      <div
      className={css`
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        padding: .1rem;
        margin-bottom: .05rem;
        justify-content: space-between;
        align-items: center;

        @media screen and (max-width: ${bp.small}px) {
        flex-wrap: nowrap;
        }
      `}
        >
      <td
       className={css`
          overflow: hidden;
          text-overflow: ellipsis;
          @media screen and (max-width: ${bp.medium}px) {
            font-size: .8rem;
          }

          @media screen and (max-width: ${bp.small}px) {
              td {
                padding: 0.15rem 0.3rem;
              }
        `}
      >
        {trackTitle}
      </td>
      <td
      className={css`
          font-size: .9rem;
        @media screen and (max-width: ${bp.medium}px) {
          font-size: .7rem;
          font-weight: bold;
          td {
            padding: 0.15rem 0.3rem;
          }
        }
      `}
        >{track.audio?.duration && fmtMSS(track.audio.duration)}</td>
      </div>
      </td>
      <td align="right">
        <IconButton
          compact
          onClick={() => {
            navigator.clipboard.writeText(widgetUrl(track.id));
            snackbar("Copied track url", { type: "success" });
          }}
        >
          <FiLink />
        </IconButton>
      </td>
    </tr>
  );
};
export default TrackRow;
