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

const ClickToPlayTracks: React.FC<{
  trackIds: number[];
  className?: string;
}> = ({ trackIds, className }) => {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const { user } = useAuthContext();
  const [localTrackIds, setLocalTrackIds] = React.useState<number[]>([]);

  const userId = user?.id;

  React.useEffect(() => {
    const callback = async () => {
      try {
        const params = new URLSearchParams();
        for (const id of trackIds) {
          params.append("trackIds[]", id.toString());
        }
        const { results } = await api.getMany<number>(
          `playable?${params.toString()}`
        );

        setLocalTrackIds(results);
      } catch (e) {
        console.error(e);
      }
    };
    callback();
  }, [trackIds, userId]);

  const onClickPlay = React.useCallback(async () => {
    dispatch({
      type: "startPlayingIds",
      playerQueueIds: localTrackIds,
    });
  }, [dispatch, localTrackIds]);

  const currentlyPlaying =
    playing &&
    currentlyPlayingIndex !== undefined &&
    localTrackIds.includes(playerQueueIds[currentlyPlayingIndex]);

  console.log("localTrackIds", localTrackIds);

  return (
    <Wrapper className={className}>
      <PlayControlButton
        onPlay={onClickPlay}
        isPlaying={currentlyPlaying}
        disabled={localTrackIds.length === 0}
        onArtistPage
      />
    </Wrapper>
  );
};

export default ClickToPlayTracks;
