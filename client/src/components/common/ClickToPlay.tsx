import styled from "@emotion/styled";
// import { useSnackbar } from "state/SnackbarContext";
import React from "react";

import { FaPause, FaPlay } from "react-icons/fa";
import { bp } from "../../constants";

import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import Button from "./Button";
import ImageWithPlaceholder from "./ImageWithPlaceholder";
import { PlayingMusicBars } from "./PlayingMusicBars";

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
  border: 0;
  transition: 0.5s;

  button {
    color: white;
    background-color: transparent;
    font-size: 1rem;

    &:nth-of-type(1) {
      margin-bottom: 0rem;
    }

    &:hover:not(:disabled) {
      background-color: rgba(0, 0, 0, 0.5);
    }
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 1;
  }

  @media (max-width: ${bp.small}px) {
    width: 100%;
    opacity: 1;
    bottom: 0;
    top: auto;
    height: 100%;
    position: absolute;

    button {
      font-size: 0.8rem;
      border: 1px solid white;
      background-color: rgba(0, 0, 0, 0.2);
    }
  }
`;

const Wrapper = styled.div<WrapperProps>`
  position: relative;
  max-width: 100%;
  overflow: clip;
  width: ${(props) => props.width}px;


  img {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, .05);
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
  trackId?: number;
  title: string;
  image?: { width: number; height: number; url: string;};
  className?: string;
}> = ({ trackGroupId, trackId, title, image, className }) => {
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
    } else if (trackId) {
      const { result } = await api.get<Track>(`tracks/${trackId}`);
      ids = [result.id];
      setTrackIds(ids);
    }
    dispatch({
      type: "startPlayingIds",
      playerQueueIds: ids,
    });
  }, [dispatch, trackGroupId, trackId]);

  // const onClickQueue = React.useCallback(async () => {
  //   if (trackGroupId) {
  //     await api
  //       .get<TrackGroup>(`trackGroups/${trackGroupId}`)
  //       .then(({ result }) => {
  //         dispatch({
  //           type: "addTrackIdsToBackOfQueue",
  //           idsToAdd: result.tracks
  //             .filter((item) => item.isPreview)
  //             .map((item) => item.id),
  //         });
  //       });
  //   } else if (trackId) {
  //     await api.get<Track>(`tracks/${trackId}`).then(({ result }) => {
  //       dispatch({
  //         type: "addTrackIdsToBackOfQueue",
  //         idsToAdd: [trackId],
  //       });
  //     });
  //   }
  //   displayMessage("Added to queue");
  // }, [trackGroupId, trackId, displayMessage, dispatch]);

  const onPause = React.useCallback(async () => {
    dispatch({ type: "setPlaying", playing: false });
  }, [dispatch]);

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
        {!currentlyPlaying && (
          <Button onClick={onClickPlay} startIcon={<FaPlay />} compact>
            Play
          </Button>
        )}
        {currentlyPlaying && (
          <Button onClick={onPause} startIcon={<FaPause />} compact>
            Pause
          </Button>
        )}
        {/* <Button onClick={onClickQueue} startIcon={<MdQueue />} compact>
          Queue
        </Button> */}
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
