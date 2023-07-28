import { cloneDeep } from "lodash";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";

import { determineNewTrackOrder } from "utils/tracks";
import { CenteredSpinner } from "../common/Spinner";
import Table from "../common/Table";
import ManageTrackRow from "./ManageTrackRow";

export const ManageTrackTable: React.FC<{
  tracks: Track[];
  isPlaylist?: boolean;
  trackGroupId?: number;
  editable?: boolean;
  owned?: boolean;
  reload?: () => Promise<void>;
}> = ({ tracks, trackGroupId, editable, reload }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const {
    state: { user, draggingTrackId },
    dispatch,
  } = useGlobalStateContext();
  const userId = user?.id;
  const [displayTracks, setDisplayTracks] = React.useState<Track[]>([]);

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

          await api.put(`trackGroup/${trackGroupId}/tracks`, {
            tracks: newTracks.map((t) => t.id),
          });
        }
      }
    },
    [displayTracks, editable, trackGroupId, draggingTrackId]
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
    <Table style={{ marginBottom: "1.5rem", marginTop: "1.5rem" }}>
      <thead>
        <tr>
          <th />
          <th>Title</th>
          <th align="right" />
        </tr>
      </thead>
      <tbody>
        {displayTracks?.map((track) => (
          <ManageTrackRow
            key={track.id}
            track={track}
            addTracksToQueue={addTracksToQueue}
            reload={reloadWrapper}
            handleDrop={handleDrop}
          />
        ))}
        {displayTracks.length === 0 && (
          <tr>
            <td colSpan={999} style={{ textAlign: "center" }}>
              There's no tracks yet in this playlist!
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
};

export default ManageTrackTable;
