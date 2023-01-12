import { css } from "@emotion/css";
import React from "react";
import { FaPause, FaPlay, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
// import { isTrackWithUserCounts } from "typeguards";
import useDraggableTrack from "utils/useDraggableTrack";

// import { FavoriteTrack } from "./FavoriteTrack";
import IconButton from "./IconButton";
// import TrackPopup from "./TrackPopup";
// import styled from "@emotion/styled";
// import { colorShade } from "utils/theme";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

const TrackRow: React.FC<{
  track: Track;
  trackGroupId?: number;
  isPlaylist?: boolean;
  addTracksToQueue: (id: number) => void;
  reload: () => Promise<void>;
  owned?: boolean;
  handleDrop: (val: React.DragEvent<HTMLTableRowElement>) => void;
}> = ({
  track,
  addTracksToQueue,
  trackGroupId,
  reload,
  handleDrop,
  owned,
  isPlaylist,
}) => {
  // const [trackPlays, setTrackPlays] = React.useState(track);
  const loadedRef = React.useRef(false);
  const snackbar = useSnackbar();
  const {
    state: { playerQueueIds, playing, currentlyPlayingIndex, user },
    dispatch,
  } = useGlobalStateContext();
  const { onDragStart, onDragEnd } = useDraggableTrack();

  const currentPlayingTrackId =
    currentlyPlayingIndex !== undefined
      ? playerQueueIds[currentlyPlayingIndex]
      : undefined;

  const onTrackPlay = React.useCallback(() => {
    addTracksToQueue(track.id);
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch, addTracksToQueue, track.id]);

  const onTrackPause = React.useCallback(() => {
    dispatch({ type: "setPlaying", playing: false });
  }, [dispatch]);

  // const fetchTrackPlays = React.useCallback(async () => {
  //   // const playCount = await checkPlayCountOfTrackIds([track.id]);
  //   setTrackPlays(playCount[0]?.count);
  // }, [track.id]);

  const onDeleteClick = React.useCallback(async () => {
    try {
      await api.delete(`track/${track.id}`);
      await reload?.();
      snackbar("Deleted track", { type: "success" });
    } catch (e) {
      console.error(e);
    }
  }, [track.id, reload, snackbar]);

  // React.useEffect(() => {
  //   if (loadedRef.current) {
  //     fetchTrackPlays();
  //   }
  //   loadedRef.current = true;
  // }, [user?.credit.total, fetchTrackPlays]);

  return (
    <tr
      key={track.id}
      id={`${track.id}`}
      onDragOver={(ev) => ev.preventDefault()}
      draggable={true}
      onDragStart={onDragStart}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      className={css`
        > td > .play-button {
          opacity: 0;
        }
        &:hover > td > .play-button {
          opacity: 1;
        }
      `}
    >
      <td>
        {(!playing || currentPlayingTrackId !== track.id) && (
          <IconButton compact className="play-button" onClick={onTrackPlay}>
            <FaPlay />
          </IconButton>
        )}
        {playing && currentPlayingTrackId === track.id && (
          <IconButton
            compact
            data-cy="track-row-pause-button"
            onClick={onTrackPause}
          >
            <FaPause />
          </IconButton>
        )}
      </td>
      <td
        className={css`
          width: 40%;
          overflow: hidden;
          whitespace: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {track.title}
      </td>
      <td
        className={css`
          width: 40%;
          overflow: hidden;
          whitespace: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {track.trackGroup && track.trackGroup.id && (
          <Link
            onClick={(e) => {
              e.stopPropagation();
            }}
            to={`/library/trackgroup/${track.trackGroup.id}`}
          >
            {track.trackGroup.title}
          </Link>
        )}
        {track.trackGroup && !track.trackGroup.id && track.trackGroup.title}
      </td>
      <td
        className={css`
          width: 20%;
          overflow: hidden;
          whitespace: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {track.artist?.id && (
          <Link
            onClick={(e) => {
              e.stopPropagation();
            }}
            to={`/library/artist/${track.artist?.id}`}
          >
            {track.artist?.name}
          </Link>
        )}
      </td>
      <td>
        <IconButton compact onClick={onDeleteClick} title="Delete">
          <FaTrash />
        </IconButton>
      </td>
    </tr>
  );
};
export default TrackRow;
