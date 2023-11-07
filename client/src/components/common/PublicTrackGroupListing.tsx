import { cloneDeep } from "lodash";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

import { CenteredSpinner } from "./Spinner";
import Table from "./Table";
import TrackRow from "./TrackRow";
import { css } from "@emotion/css";
import { bp } from "../../constants";

export const PublicTrackGroupListing: React.FC<{
  tracks: Track[];
  trackGroup: TrackGroup;
}> = ({ tracks, trackGroup }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { dispatch } = useGlobalStateContext();
  const [displayTracks, setDisplayTracks] = React.useState<Track[]>([]);

  const fetchTracks = React.useCallback(async (checkTracks: Track[]) => {
    const cloned = cloneDeep(checkTracks);

    setDisplayTracks(cloned);
    setIsLoading(false);
  }, []);

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

  if (isLoading) {
    return <CenteredSpinner />;
  }

  return (
    <Table
      className={css`

        margin: 0 0.5rem;

        @media screen and (max-width: ${bp.medium}px) {
          margin: 0;
        }
      `}
    >
      <tbody>
        {displayTracks?.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            addTracksToQueue={addTracksToQueue}
            trackGroup={trackGroup}
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

export default PublicTrackGroupListing;
