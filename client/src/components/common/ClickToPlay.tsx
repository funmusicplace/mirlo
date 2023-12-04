import styled from "@emotion/styled";
import React from "react";
import { bp } from "../../constants";

import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import ImageWithPlaceholder from "./ImageWithPlaceholder";
import { PlayingMusicBars } from "./PlayingMusicBars";
import PlayButton from "./PlayButton";

type WrapperProps = {
  width: number;
  height: number;
};

const PlayWrapper = styled.div<WrapperProps>`
  display: flex;
  flex-direction: column;
  position: absolute;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  top: 0;
  opacity: 0;
  background-color: rgba(0, 0, 0, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: 0.5s;

  .startIcon {
    margin-right: 0rem !important;
  }

  button {
    color: white;
    background-color: transparent;
    width: 3em;
    height: 3em;
    border-radius: 50px;
    font-size: 1rem;
    padding: 0.9rem;
    padding-left: 1rem;

    &:nth-of-type(1) {
      margin: 0rem;
    }

    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.5);
      color: var(--mi-black);
    }
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 1;
  }

  @media (max-width: ${bp.small}px) {
    background-color: transparent !important;
    opacity: 1;
    justify-content: flex-end;
    align-items: flex-end;

    button {
      width: 2em;
      height: 2em;
      font-size: 1.1rem;
      padding: 0rem;
      padding-left: 0.6rem;
      margin: auto;
      border-radius: 0px;
      border: none;
      background-color: rgba(0, 0, 0, 0.7);
    }
    button:active {
      background-color: rgba(0, 0, 0, 0.7);
    }
    .startIcon {
    }
  }
`;

const Wrapper = styled.div<WrapperProps>`
  position: relative;
  max-width: 100%;
  width: ${(props) => props.width}px;

  .startIcon {
    font-size: 1.3rem !important;
  }

  img {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
    display: block;
    // padding-top: ${(props) => props.height / 2 - 12}px;
  }

  @media (max-width: ${bp.medium}px) {
    position: relative;

    img {
      width: ${(props) => (props.width < 420 ? `${props.width}px` : "100%")};
      height: ${(props) => (props.height < 420 ? `${props.height}px` : "auto")};
    }
  }
`;

const ClickToPlay: React.FC<{
  trackGroupId?: number;
  title: string;
  image?: { width: number; height: number; url: string };
  className?: string;
}> = ({ trackGroupId, title, image, className }) => {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  // const displayMessage = useSnackbar();
  const [trackIds, setTrackIds] = React.useState<number[]>([]);

  const onClickPlay = React.useCallback(async () => {
    let ids: number[] = [];
    if (trackGroupId) {
      const { result } = await api.get<TrackGroup>(
        `trackGroups/${trackGroupId}`
      );
      ids = result.tracks
        .filter((item) => item.isPreview)
        .map((item) => item.id);
      setTrackIds(ids);
    }
    dispatch({
      type: "startPlayingIds",
      playerQueueIds: ids,
    });
  }, [dispatch, trackGroupId]);

  const currentlyPlaying =
    playing &&
    currentlyPlayingIndex !== undefined &&
    trackIds.includes(playerQueueIds[currentlyPlayingIndex]);

  return (
    <Wrapper
      width={image?.width ?? 0}
      height={image?.height ?? 0}
      className={className}
    >
      <PlayWrapper width={image?.width ?? 0} height={image?.height ?? 0}>
        {!currentlyPlaying && <PlayButton onPlay={onClickPlay} />}
      </PlayWrapper>
      {currentlyPlaying && (
        <PlayingMusicBars
          width={image?.width ?? 0}
          height={image?.height ?? 0}
        />
      )}

      {image && (
        <ImageWithPlaceholder src={image.url} alt={title} size={image.width} />
      )}
    </Wrapper>
  );
};

export default ClickToPlay;
