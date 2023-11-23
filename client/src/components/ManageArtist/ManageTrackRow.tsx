import { css } from "@emotion/css";
import React from "react";
import { FaPen, FaTrash } from "react-icons/fa";
import { useGlobalStateContext } from "state/GlobalState";
import useDraggableTrack from "utils/useDraggableTrack";

import IconButton from "../common/IconButton";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { fmtMSS } from "utils/tracks";
import TrackRowPlayControl from "components/common/TrackRowPlayControl";
import { useTranslation } from "react-i18next";
import EditTrackRow from "./EditTrackRow";

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
  const [isEditing, setIsEditing] = React.useState(false);
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

  const uploadState = track.audio?.uploadState;
  const isDisabled = track.audio && uploadState === "STARTED";
  const isError = uploadState === "ERROR";

  const onCancelEditing = React.useCallback(() => {
    setIsEditing(false);

    reload();
  }, [reload]);

  if (isEditing) {
    return <EditTrackRow track={track} onCancelEditing={onCancelEditing} />;
  }

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
        ${isError ? `background-color: red;` : ""}
        ${isDisabled ? `opacity: .5;` : ""}
      `}
    >
      <td>
        <TrackRowPlayControl
          trackId={track.id}
          canPlayTrack={true}
          trackNumber={track.order}
          onTrackPlayCallback={addTracksToQueue}
          isDisabled={isDisabled}
        />
      </td>
      <td
        className={css`
          width: 40%;
          overflow: hidden;
          whitespace: nowrap;
          text-overflow: ellipsis;
          &:hover {
            background-color: transparent !important;
          }

          &:before {
            content: "${t("titleColumn")}: ";
          }
        `}
      >
        <div>
          <div>{track.title}</div>
          <small>
            {uploadState === "SUCCESS" && t("doneUploadingTrack")}
            {uploadState === "STARTED" && t("stillProcessing")}
            {uploadState === "ERROR" && t("thereWasAnError")}
          </small>
        </div>
      </td>
      <td
        className={css`
          &:before {
            content: "${t("listedArtists")}: ";
          }
        `}
      >
        {track.trackArtists?.map((artist) => artist.artistName).join(", ")}
      </td>
      <td
        className={css`
          &:before {
            content: "${t("status")}: ";
          }
        `}
      >
        {t(track.isPreview ? "statusPreview" : "statusMustOwn")}
      </td>
      <td
        className={
          "alignRight " +
          css`
            &:before {
              content: "${t("durationColumn")}: ";
            }
          `
        }
      >
        {track.audio?.duration && fmtMSS(track.audio?.duration)}
      </td>
      <td>
        <IconButton
          compact
          onClick={() => setIsEditing(true)}
          title={t("edit") ?? ""}
          style={{ marginRight: ".25rem" }}
          disabled={isDisabled}
        >
          <FaPen />
        </IconButton>
        <IconButton
          compact
          onClick={onDeleteClick}
          title={t("delete") ?? ""}
          disabled={isDisabled}
        >
          <FaTrash />
        </IconButton>
      </td>
    </tr>
  );
};
export default ManageTrackRow;
