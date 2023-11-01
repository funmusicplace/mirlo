import { cloneDeep } from "lodash";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";

import { determineNewTrackOrder } from "utils/tracks";
import { CenteredSpinner } from "../common/Spinner";
import Table from "../common/Table";
import ManageTrackRow from "./ManageTrackRow";
import { useTranslation } from "react-i18next";

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
          console.log(
            "tracks",
            newTracks.map((t) => t.id)
          );
          setDisplayTracks(newTracks);

          // FIXME: this endpoint isn't implemented
          await api.put(
            `users/${userId}/trackGroups/${trackGroupId}/trackOrder`,
            {
              trackIds: newTracks.map((t) => t.id),
            }
          );

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
    <Table style={{ marginBottom: "1.5rem", marginTop: "1.5rem" }}>
      <thead>
        <tr>
          <th />
          <th>{t("titleColumn")}</th>
          <th>{t("durationColumn")}</th>
          <th className="alignRight">{t("manageColumn")}</th>
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
              {t("emptyTracklist")}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
};

export default ManageTrackTable;
