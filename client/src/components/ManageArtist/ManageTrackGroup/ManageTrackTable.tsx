import styled from "@emotion/styled";
import { cloneDeep } from "lodash";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
import { determineNewTrackOrder } from "utils/tracks";

import { bp } from "../../../constants";
import { CenteredSpinner } from "../../common/Spinner";
import Table from "../../common/Table";

import ManageTrackRow from "./ManageTrackRow";

const TrackTableComponent = styled(Table)`
  margin-bottom: 1.5rem;
  margin-top: 1rem;

  &.mi-table tbody tr:nth-child(odd) {
    background-color: transparent;
  }

  &.mi-table tbody tr:not(:last-child) {
    border-bottom: 1px solid var(--mi-tint-color);
  }

  &.mi-table th:not(:last-child),
  &.mi-table td:not(:last-child) {
    border-right: none;
  }

  &.mi-table th:nth-child(4),
  &.mi-table td:nth-child(4),
  &.mi-table th:nth-child(5) {
    text-align: center;
  }

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
      const ids = tracks.map((track) => track.id);
      const startingIndex = ids.indexOf(id);
      dispatch({
        type: "startPlayingIds",
        playerQueueIds: ids,
        startingIndex: startingIndex >= 0 ? startingIndex : 0,
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
    <TrackTableComponent>
      <thead>
        <tr>
          <th />
          <th>{t("titleColumn")}</th>
          <th>{t("status")}</th>
          <th>{t("durationColumn")}</th>
          <th className="alignRight" style={{ minWidth: "8rem" }}>
            {t("manageColumn")}
          </th>
        </tr>
      </thead>
      <tbody>
        {displayTracks?.map((track) => (
          <ManageTrackRow
            key={track.id}
            track={track}
            artistId={artistId}
            addTracksToQueue={addTracksToQueue}
            reload={reloadWrapper}
            handleDrop={handleDrop}
          />
        ))}
        {displayTracks.length === 0 && (
          <tr>
            <td colSpan={999} style={{ textAlign: "center" }}>
              {t("emptyTracklist")}
            </td>
          </tr>
        )}
      </tbody>
    </TrackTableComponent>
  );
};

export default ManageTrackTable;
