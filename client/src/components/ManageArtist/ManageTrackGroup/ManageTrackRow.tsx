import { css } from "@emotion/css";
import React from "react";
import {
  FaDownload,
  FaExclamationTriangle,
  FaPen,
  FaTrash,
} from "react-icons/fa";
import useDraggableTrack from "utils/useDraggableTrack";

import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { fmtMSS } from "utils/tracks";
import TrackRowPlayControl from "components/common/TrackTable/TrackRowPlayControl";
import { useTranslation } from "react-i18next";
import EditTrackRow from "./AlbumFormComponents/EditTrackRow";
import styled from "@emotion/styled";
import LoadingSpinner from "components/common/LoadingSpinner";
import { useAuthContext } from "state/AuthContext";
import ManageTrackArtists from "./ManageTrackArtists";
import ClickToEditInput from "./AlbumFormComponents/ClickToEditInput";
import {
  ArtistButton,
  ArtistButtonAnchor,
} from "components/Artist/ArtistButtons";
import Tooltip from "components/common/Tooltip";

const TrackRow = styled("tr")`
  > td > .play-button {
    display: none;
    svg {
      margin-left: 15%;
    }
  }
  > td > .track-number {
    display: block;
    padding: 0.4rem;
    font-size: 0.9rem;
  }
  &:hover > td > .play-button {
    display: block;
  }

  &:hover > td > .track-number {
    display: none;
  }

  &:hover {
    background-color: var(--mi-darken-background-color);

    @media (prefers-color-scheme: dark) {
      background-color: var(--mi-lighten-background-color);
    }
  }
`;

const ManageTrackRow: React.FC<{
  track: Track;
  addTracksToQueue: (id: number) => void;
  reload: () => Promise<void>;
  handleDrop: (val: React.DragEvent<HTMLTableRowElement>) => void;
}> = ({ track, addTracksToQueue, reload, handleDrop }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageTrackTable",
  });
  const [uploadState, setUploadState] = React.useState(
    track.audio?.uploadState
  );
  const snackbar = useSnackbar();
  const [isEditing, setIsEditing] = React.useState(false);
  const { user } = useAuthContext();
  const { onDragStart, onDragEnd } = useDraggableTrack();
  const userId = user?.id;

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (uploadState === "STARTED") {
      interval = setInterval(async () => {
        const result = await api.get<Track>(`manage/tracks/${track.id}`);
        const newState = result.result.audio?.uploadState;

        setUploadState(newState);
        if (newState === "SUCCESS" && interval) {
          clearInterval(interval);
        }
      }, 4000);
    }
    return () => (interval ? clearInterval(interval) : undefined);
  }, [track.id, uploadState, userId]);

  const onDeleteClick = React.useCallback(async () => {
    try {
      const confirm = window.confirm(t("areYouSureDelete") ?? "");
      if (confirm) {
        await api.delete(`manage/tracks/${track.id}`);
        await reload?.();
        snackbar(t("deleteTrackSuccess"), { type: "success" });
      }
    } catch (e) {
      console.error(e);
    }
  }, [track.id, userId, reload, snackbar]);

  const getDownloadOriginalUrl = React.useCallback(() => {
    try {
      return api.getFileDownloadUrl(
        `manage/tracks/${track.id}/downloadOriginal`
      );
    } catch (e) {
      console.error(e);
    }
  }, [track.id, userId, reload, snackbar]);

  const createdDate = track.audio
    ? new Date(track.audio.createdAt).getTime()
    : 0;
  const is2HoursAgo = new Date().getTime() - 7200000; // 2hrs in miliseconds
  const isOlderThan4Hours = createdDate < is2HoursAgo;
  const isAudioDisabled =
    track.audio && uploadState === "STARTED" && !isOlderThan4Hours;
  const isError = uploadState === "ERROR";

  const onCancelEditing = React.useCallback(() => {
    setIsEditing(false);

    reload();
  }, [reload]);

  if (isEditing) {
    return (
      <EditTrackRow
        track={track}
        onCancelEditing={onCancelEditing}
        reload={reload}
      />
    );
  }

  console.log("track", track.audio);

  return (
    <TrackRow
      key={track.id}
      id={`${track.id}`}
      onDragOver={(ev) => ev.preventDefault()}
      draggable={true}
      onDragStart={onDragStart}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      className={css`
        ${isError ? `background-color: red;` : ""}
        &:hover {
          cursor: grab;
        }
        ${!track.audio ? "background-color: red;" : ""}
      `}
    >
      <td
        className={css`
          width: 50px;
          text-align: center;
        `}
      >
        {track.audio && (
          <TrackRowPlayControl
            trackId={track.id}
            canPlayTrack={true}
            trackNumber={track.order}
            onTrackPlayCallback={addTracksToQueue}
            isDisabled={isAudioDisabled}
          />
        )}
        {!track.audio && (
          <Tooltip hoverText="Track audio is missing">
            <FaExclamationTriangle />
          </Tooltip>
        )}
      </td>
      <td
        className={css`
          width: 40%;
          overflow: hidden;
          whitespace: nowrap;
          text-overflow: ellipsis;
          background-color: ${!track.title
            ? "var(--mi-warning-background-color)"
            : "transparent"};
          &:hover {
            background-color: ${!track.title
              ? "var(--mi-warning-background-color)"
              : "transparent"};
          }

          &:before {
            content: "${t("titleColumn")}: ";
          }
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: center;

            > svg {
              margin-right: 1rem;
            }
          `}
        >
          {!track.title && <FaExclamationTriangle />}
          <div>
            <ClickToEditInput
              defaultValue={track.title}
              url={`manage/tracks/${track.id}`}
              formKey="title"
              reload={reload}
            />
            <small>
              {t("originalFilename", {
                filename: track.audio?.originalFilename,
              })}
              <div>
                {uploadState === "SUCCESS" && t("doneUploadingTrack")}
                {uploadState === "STARTED" && (
                  <>
                    <LoadingSpinner />
                    {t("stillProcessing")}
                  </>
                )}
                {uploadState === "ERROR" && t("thereWasAnError")}
              </div>
            </small>
          </div>
        </div>
      </td>
      <td
        className={css`
          &:before {
            content: "${t("listedArtists")}: ";
          }
        `}
      >
        <ManageTrackArtists
          trackArtists={track.trackArtists ?? []}
          onSave={reload}
          trackId={track.id}
        />
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
      <td
        align="right"
        className={css`
          width: 150px;

          button,
          a {
            display: inline-block;
          }
        `}
      >
        <ArtistButtonAnchor
          size="compact"
          startIcon={<FaDownload />}
          variant="dashed"
          href={getDownloadOriginalUrl()}
          title={t("downloadOriginal") ?? ""}
          style={{ marginRight: ".25rem" }}
        ></ArtistButtonAnchor>
        <ArtistButton
          size="compact"
          startIcon={<FaPen />}
          variant="dashed"
          onClick={() => setIsEditing(true)}
          title={t("edit") ?? ""}
          style={{ marginRight: ".25rem" }}
        />
        <ArtistButton
          variant="dashed"
          startIcon={<FaTrash />}
          size="compact"
          onClick={onDeleteClick}
          title={t("delete") ?? ""}
        />
      </td>
    </TrackRow>
  );
};
export default ManageTrackRow;
