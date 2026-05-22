import { css } from "@emotion/css";
import TipArtist from "components/common/TipArtist";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import Wishlist from "components/TrackGroup/Wishlist";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

import useCurrentTrackHook from "./useCurrentTrackHook";

const PlayerActions: React.FC = () => {
  const { state } = useGlobalStateContext();
  const { currentTrack, isLoading } = useCurrentTrackHook();

  if (!state.playing) {
    return null;
  }

  if (!currentTrack || isLoading) {
    return null;
  }

  return (
    <div
      className={css`
        z-index: 10;
        bottom: var(--player-actions-bottom-offset, 80px);
        right: 1rem;
        position: fixed;
        display: flex;
        gap: 0.5rem;

        @media (max-width: 768px) {
          bottom: var(
            --player-actions-bottom-offset-mobile,
            var(--player-actions-bottom-offset, 80px)
          );
          right: 0.5rem;
        }
      `}
    >
      <Wishlist trackGroup={{ id: currentTrack.trackGroupId }} fixed />
      {currentTrack.trackGroup.artistId && (
        <TipArtist artistId={currentTrack.trackGroup.artistId} fixed />
      )}
      {currentTrack.trackGroup && (
        <PurchaseOrDownloadAlbum trackGroup={currentTrack.trackGroup} fixed />
      )}
    </div>
  );
};

export default PlayerActions;
