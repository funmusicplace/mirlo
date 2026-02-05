import styled from "@emotion/styled";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

import PlayControlButton from "./PlayControlButton";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { queryArtist } from "queries";

const Wrapper = styled.div<{ colors?: ArtistColors }>`
  position: relative;
  max-width: 100%;

  .startIcon {
    font-size: 1.3rem !important;
  }

  button {
    background-color: ${(props) =>
      props.colors?.primary ?? "var(--mi-primary-color)"} !important;
    color: ${(props) =>
      props.colors?.secondary ?? "var(--mi-secondary-color)"} !important;
    border: 0px !important;
    width: 3rem;
    height: 3rem;

    svg {
      fill: ${(props) =>
        props.colors?.secondary ?? "var(--mi-secondary-color)"} !important;
    }

    &:hover:not(:disabled) {
      color: ${(props) =>
        props.colors?.primary ?? "var(--mi-primary-color)"} !important;
      background-color: ${(props) =>
        props.colors?.secondary ?? "var(--mi-secondary-color)"} !important;

      svg {
        fill: ${(props) =>
          props.colors?.primary ?? "var(--mi-primary-color)"} !important;
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
    <Wrapper className={className} colors={artist.properties?.colors}>
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
