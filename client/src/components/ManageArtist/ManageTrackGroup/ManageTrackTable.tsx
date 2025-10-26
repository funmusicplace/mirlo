import { css } from "@emotion/css";
import { cloneDeep } from "lodash";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import { bp } from "../../../constants";
import {
  FaDownload,
  FaExclamationTriangle,
  FaPen,
  FaTrash,
} from "react-icons/fa";

import { determineNewTrackOrder, fmtMSS } from "utils/tracks";
import { CenteredSpinner } from "../../common/Spinner";
import Table from "../../common/Table";
import ManageTrackRow from "./ManageTrackRow";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { useAuthContext } from "state/AuthContext";
import TrackRowPlayControl from "components/common/TrackTable/TrackRowPlayControl";
import TrackAuthors from "components/common/TrackTable/TrackAuthors";
import {
  ArtistButton,
  ArtistButtonAnchor,
} from "components/Artist/ArtistButtons";
import EditTrackRow from "./AlbumFormComponents/EditTrackRow";

const TrackTableComponent = styled(Table)`
  margin-bottom: 1.5rem;
  margin-top: 1rem;

  @media screen and (max-width: ${bp.medium}px) {
    display: block;

    & thead,
    tbody,
    td,
    tr,
    th {
      display: block;
    }

    thead {
      position: absolute;
      top: -9999px;
      left: -9999px;
    }

    tr {
      margin-bottom: 1rem;
      border: 1px solid #ccc;
    }

    td {
      /* Behave  like a "row" */
      border: none;
      border-bottom: 1px solid #eee;
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }

    td:before {
      /* Now like a table header */
      display: inline-block;
      color: grey;
      padding-right: 10px;
      // white-space: nowrap;
    }

    td.alignRight {
      text-align: left !important;
    }
  }
  @media screen and (min-width: ${bp.medium}px) {
    td {
      padding: 0.5rem 0.5rem;
    }
    td:before {
      display: none;
    }
  }
`;

export const ManageTrackTable: React.FC<{
  tracks: Track[];
  isPlaylist?: boolean;
  trackGroupId?: number;
  artistId: number;
  editable?: boolean;
  owned?: boolean;
  reload?: () => Promise<unknown>;
}> = ({ tracks, trackGroupId, artistId, editable, reload }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const {
    state: { draggingTrackId },
    dispatch,
  } = useGlobalStateContext();
  const { user } = useAuthContext();
  const userId = user?.id;
  const [displayTracks, setDisplayTracks] = React.useState<Track[]>([]);
  const { t } = useTranslation("translation", {
    keyPrefix: "manageTrackTable",
  });

  const handleDrop = React.useCallback(
    async (ev: React.DragEvent<HTMLTableRowElement>) => {
      ev.preventDefault();
      if (editable && draggingTrackId) {
        const droppedInId = +ev.currentTarget.id;
        const newTracks = determineNewTrackOrder(
          displayTracks,
          droppedInId,
          draggingTrackId
        );
        if (trackGroupId) {
          setDisplayTracks(newTracks);

          await api.put(`manage/trackGroups/${trackGroupId}/trackOrder`, {
            trackIds: newTracks.map((t) => t.id),
          });

          reload?.();
        }
      }
    },
    [editable, draggingTrackId, displayTracks, trackGroupId, reload, userId]
  );

  const fetchTracks = React.useCallback(
    async (checkTracks: Track[]) => {
      const cloned = cloneDeep(checkTracks);

      if (userId) {
        // const newTracks = await mapFavoriteAndPlaysToTracks(cloned);
        setDisplayTracks(cloned);
      } else {
        setDisplayTracks(cloned);
      }
      setIsLoading(false);
    },
    [userId]
  );

  React.useEffect(() => {
    setIsLoading(true);
    fetchTracks(tracks);
  }, [tracks, fetchTracks]);

  const addTracksToQueue = React.useCallback(
    (id: number) => {
      const idx = tracks.findIndex((track) => track.id === id);
      dispatch({
        type: "startPlayingIds",
        playerQueueIds: tracks
          .slice(idx, tracks.length)
          .map((track) => track.id),
      });
    },
    [dispatch, tracks]
  );

  const reloadWrapper = React.useCallback(async () => {
    if (trackGroupId) {
      if (reload) {
        await reload();
      }
    }
  }, [reload, trackGroupId]);

  if (isLoading) {
    return <CenteredSpinner />;
  }

  return (
      <ol>
        {displayTracks?.map((track) => (
          <li key={track.id}>
            <details>
              <summary
                style={{ display: "flex", position: "sticky", top: "0" }}
              >
                {track.audio && (
                  <TrackRowPlayControl
                    trackId={track.id}
                    canPlayTrack={true}
                    trackNumber={track.order}
                    onTrackPlayCallback={addTracksToQueue}
                    isDisabled={
                      track.audio &&
                      track.audio.uploadState === "STARTED" &&
                      !isOlderThan4Hours
                    }
                  />
                )}
                {!track.audio && (
                  <Tooltip hoverText="Track audio is missing">
                    <FaExclamationTriangle />

                    <ReplaceTrackAudioInput
                      trackId={track.id}
                      reload={reload}
                    />
                  </Tooltip>
                )}
                <div
                  className={css`
                    display: flex;
                    align-items: center;
                  `}
                >
                  <div>
                    {track.title || track.audio?.originalFilename}
                    <TrackAuthors track={track} trackGroupArtistId={artistId} />
                    <p>
                      <small>
                        {track.audio?.uploadState === "SUCCESS" &&
                          t("doneUploadingTrack")}
                        {track.audio?.uploadState === "STARTED" && (
                          <>
                            <LoadingSpinner size="small" />
                            {t("stillProcessing")}
                          </>
                        )}
                        {track.audio?.uploadState === "ERROR" &&
                          t("thereWasAnError")}
			{!track.title && <div
                        className={css`
                          filter: hue-rotate(90deg);
                        `}
                      >
                        <FaExclamationTriangle /> {t("missingTitle")}
                      </div>}
                      </small>
                    </p>
                  </div>
                </div>
                {track.audio?.duration && fmtMSS(track.audio?.duration)}
                <ArtistButtonAnchor
                  size="compact"
                  startIcon={<FaDownload />}
                  variant="dashed"
                  href={
                    "hello" // getDownloadOriginalUrl()
                  }
                  title={t("downloadOriginal") ?? ""}
                  style={{ marginRight: ".25rem" }}
                ></ArtistButtonAnchor>
                <ArtistButton
                  variant="dashed"
                  startIcon={<FaTrash />}
                  size="compact"
                  onClick={
                    () => console.log("poop") // onDeleteClick
                  }
                  title={t("delete") ?? ""}
                />
              </summary>
              <EditTrackRow
                track={track}
                onCancelEditing={() => console.log("cancel")}
                reload={reload}
              />
            </details>
          </li>
        ))}
      </ol>
  );
};

export default ManageTrackTable;
