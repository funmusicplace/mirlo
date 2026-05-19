import { cloneDeep } from "lodash";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
import { isTrackOwnedOrPreview } from "utils/tracks";

import { CenteredSpinner } from "../Spinner";
import Table from "../Table";

import TrackRow from "./TrackRow";

export const PublicTrackGroupListing: React.FC<{
  tracks: Track[];
  trackGroup?: TrackGroup;
  size?: "small" | "compact";
  showDropdown?: boolean;
  inWidget?: boolean;
}> = ({ tracks, trackGroup, size, showDropdown = true, inWidget }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = React.useState(true);
  const { dispatch } = useGlobalStateContext();
  const [displayTracks, setDisplayTracks] = React.useState<Track[]>([]);

  const fetchTracks = React.useCallback(async () => {
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    setIsLoading(true);
    const cloned = cloneDeep(tracks);
    setDisplayTracks(cloned);
    setIsLoading(false);
  }, [tracks, fetchTracks]);

  const addTracksToQueue = React.useCallback(
    (id: number) => {
      const playableIds = tracks
        .filter((track) => isTrackOwnedOrPreview(track, user, trackGroup))
        .map((track) => track.id);
      const startingIndex = playableIds.indexOf(id);
      dispatch({
        type: "startPlayingIds",
        playerQueueIds: playableIds,
        startingIndex: startingIndex >= 0 ? startingIndex : 0,
      });
    },
    [dispatch, trackGroup, tracks, user]
  );

  if (isLoading) {
    return <CenteredSpinner />;
  }

  return (
    <Table isTrackRow className={`max-sm:m-0 ${inWidget ? "table-fixed" : ""}`}>
      <tbody>
        {displayTracks?.map((track) => (
          <TrackRow
            showDropdown={showDropdown}
            key={track.id}
            track={track}
            addTracksToQueue={addTracksToQueue}
            trackGroup={track.trackGroup ?? trackGroup}
            size={size}
            inWidget={inWidget}
          />
        ))}
      </tbody>
    </Table>
  );
};

export default PublicTrackGroupListing;
