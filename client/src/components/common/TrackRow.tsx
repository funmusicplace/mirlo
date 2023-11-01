import { css } from "@emotion/css";
import React from "react";
import { FaLink } from "react-icons/fa";
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

        font-size: 18px;

        @media screen and (max-width: ${bp.medium}px) {
          font-size: 16px;
          td {
            padding: 0.15rem 0.3rem;
          }
        }

        button {
          font-size: 16px;
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
          width: 30px;
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
          max-width: 100px;
          width: 40%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {trackTitle}
      </td>
      <td
        className={css`
          max-width: 100px;
          width: 40%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {trackGroup.artist?.name}
      </td>
      <td>{track.audio?.duration && fmtMSS(track.audio.duration)}</td>
      <td align="right">
        <IconButton
          compact
          onClick={() => {
            navigator.clipboard.writeText(widgetUrl(track.id));
            snackbar("Copied track url", { type: "success" });
          }}
        >
          <FaLink />
        </IconButton>
      </td>
    </tr>
  );
};
export default TrackRow;
