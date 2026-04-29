import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import React from "react";
import { useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";

import PlayControlButton from "./PlayControlButton";

const Wrapper = styled.div`
  position: relative;
  max-width: 100%;

  .startIcon {
    font-size: 1.3rem !important;
  }

  button {
    background-color: var(--mi-button-color) !important;
    color: var(--mi-button-text-color) !important;
    border: 0px !important;
    width: 3rem;
    height: 3rem;

    svg {
      fill: var(--mi-button-text-color) !important;
    }

    &:hover:not(:disabled) {
      color: var(--mi-button-color) !important;
      background-color: var(--mi-button-text-color) !important;

      svg {
        fill: var(--mi-button-color) !important;
      }
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
  const params = useParams();

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: params.artistId ?? "" })
  );

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

  if (!artist) {
    return null;
  }

  return (
    <Wrapper className={className}>
      <PlayControlButton
        onPlay={onClickPlay}
        isPlaying={currentlyPlaying}
        disabled={trackIds.length === 0}
        onArtistPage
      />
    </Wrapper>
  );
};

export default ClickToPlayTracks;
