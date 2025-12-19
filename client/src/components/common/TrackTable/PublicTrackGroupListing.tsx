import { cloneDeep } from "lodash";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

import { CenteredSpinner } from "../Spinner";
import Table from "../Table";
import TrackRow from "./TrackRow";
import { css } from "@emotion/css";
import { bp } from "../../../constants";
import { isTrackOwnedOrPreview } from "utils/tracks";
import { useAuthContext } from "state/AuthContext";
import { useTranslation } from "react-i18next";

export const PublicTrackGroupListing: React.FC<{
  tracks: Track[];
  trackGroup?: TrackGroup;
  size?: "small";
  showDropdown?: boolean;
}> = ({ tracks, trackGroup, size, showDropdown = true }) => {
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
      const idx = tracks.findIndex((track) => track.id === id);
      dispatch({
        type: "startPlayingIds",
        playerQueueIds: tracks
          .slice(idx, tracks.length)
          .filter((track) => {
            return isTrackOwnedOrPreview(track, user, trackGroup);
          })
          .map((track) => track.id),
      });
    },
    [dispatch, trackGroup, tracks, user]
  );

  if (isLoading) {
    return <CenteredSpinner />;
  }

  return (
    <Table
      className={css`
        @media screen and (max-width: ${bp.small}px) {
          margin: 0;
        }
      `}
    >
      <tbody>
        {displayTracks?.map((track) => (
          <TrackRow
            showDropdown={showDropdown}
            key={track.id}
            track={track}
            addTracksToQueue={addTracksToQueue}
            trackGroup={track.trackGroup ?? trackGroup}
            size={size}
          />
        ))}
      </tbody>
    </Table>
  );
};

export default PublicTrackGroupListing;
