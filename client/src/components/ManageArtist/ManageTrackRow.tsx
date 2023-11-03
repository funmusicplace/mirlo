import { css } from "@emotion/css";
import React from "react";
import { FaPen, FaSave, FaTrash } from "react-icons/fa";
import { useGlobalStateContext } from "state/GlobalState";
import useDraggableTrack from "utils/useDraggableTrack";

import IconButton from "../common/IconButton";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { InputEl } from "../common/Input";
import { fmtMSS } from "utils/tracks";
import TrackRowPlayControl from "components/common/TrackRowPlayControl";
import { useTranslation } from "react-i18next";

const ManageTrackRow: React.FC<{
  track: Track;
  addTracksToQueue: (id: number) => void;
  reload: () => Promise<void>;
  handleDrop: (val: React.DragEvent<HTMLTableRowElement>) => void;
}> = ({ track, addTracksToQueue, reload, handleDrop }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageTrackTable",
  });

  const snackbar = useSnackbar();
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [trackTitle, setTrackTitle] = React.useState(track.title);
  const {
    state: { user },
  } = useGlobalStateContext();
  const { onDragStart, onDragEnd } = useDraggableTrack();

  const userId = user?.id;

  const onDeleteClick = React.useCallback(async () => {
    try {
      await api.delete(`users/${userId}/tracks/${track.id}`);
      await reload?.();
      snackbar("Deleted track", { type: "success" });
    } catch (e) {
      console.error(e);
    }
  }, [track.id, userId, reload, snackbar]);

  const updateTrackTitle = React.useCallback(async () => {
    try {
      await api.put<{ title: string }, unknown>(
        `users/${userId}/tracks/${track.id}`,
        {
          title: trackTitle,
        }
      );
    } catch (e) {
    } finally {
      setIsEditingTitle(false);
    }
  }, [track.id, trackTitle, userId]);

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
      <td>
        <TrackRowPlayControl
          trackId={track.id}
          trackNumber={track.order}
          onTrackPlayCallback={addTracksToQueue}
        />
      </td>
      <td
        className={css`
          width: 40%;
          overflow: hidden;
          whitespace: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {!isEditingTitle && trackTitle}
        {isEditingTitle && (
          <InputEl
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
          />
        )}
      </td>
      <td>
        {track.trackArtists?.map((artist) => artist.artistName).join(", ")}
      </td>
      <td>{t(track.isPreview ? "statusPreview" : "statusMustOwn")}</td>
      <td className="alignRight">
        {track.audio?.duration && fmtMSS(track.audio?.duration)}
      </td>
      <td className="alignRight">
        {isEditingTitle && (
          <IconButton onClick={updateTrackTitle} title="Delete">
            <FaSave />
          </IconButton>
        )}
        {!isEditingTitle && (
          <>
            <IconButton
              compact
              onClick={() => setIsEditingTitle(true)}
              title={t("edit") ?? ""}
              style={{ marginRight: "1rem" }}
            >
              <FaPen />
            </IconButton>
            <IconButton
              compact
              onClick={onDeleteClick}
              title={t("delete") ?? ""}
            >
              <FaTrash />
            </IconButton>
          </>
        )}
      </td>
    </tr>
  );
};
export default ManageTrackRow;
