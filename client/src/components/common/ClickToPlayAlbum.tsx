import styled from "@emotion/styled";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";

import PlayControlButton from "./PlayControlButton";
import { useAuthContext } from "state/AuthContext";

const Wrapper = styled.div`
  position: relative;
  max-width: 100%;

  .startIcon {
    font-size: 1.3rem !important;
  }

  button {
    background-color: var(--mi-secondary-color);
    color: var(--mi-primary-color);
    border: 0px !important;
    width: 3rem;
    height: 3rem;

    &:hover:not(:disabled) {
      background-color: var(--mi-primary-color);
      color: var(--mi-secondary-color);
    }
  }
`;

const ClickToPlayAlbum: React.FC<{
  trackGroupId: number;
  className?: string;
}> = ({ trackGroupId, className }) => {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const { user } = useAuthContext();
  const [trackIds, setTrackIds] = React.useState<number[]>([]);

  const userId = user?.id;

  React.useEffect(() => {
    const callback = async () => {
      const { result } = await api.get<TrackGroup>(
        `trackGroups/${trackGroupId}`
      );
      try {
        let isOwned = false;
        if (userId) {
          const userIsTrackGroupArtist = result.artist?.userId === userId;

          if (!userIsTrackGroupArtist) {
            const { results: purchases } =
              await api.getMany<UserTrackGroupPurchase>(
                `users/${userId}/trackGroupPurchases?trackGroupId=${trackGroupId}`
              );

            isOwned = purchases.length > 0;
          } else {
            isOwned = true;
          }
        }
        const ids = result.tracks
          .filter((item) => item.isPreview || isOwned)
          .map((item) => item.id);
        setTrackIds(ids);
      } catch (e) {
        console.error(e);
      }
    };
    callback();
  }, [trackGroupId, userId]);

  const onClickPlay = React.useCallback(async () => {
    dispatch({
      type: "startPlayingIds",
      playerQueueIds: trackIds,
    });
  }, [dispatch, trackIds]);

  const currentlyPlaying =
    playing &&
    currentlyPlayingIndex !== undefined &&
    trackIds.includes(playerQueueIds[currentlyPlayingIndex]);

  return (
    <Wrapper className={className}>
      <PlayControlButton onPlay={onClickPlay} isPlaying={currentlyPlaying} />
    </Wrapper>
  );
};

export default ClickToPlayAlbum;
