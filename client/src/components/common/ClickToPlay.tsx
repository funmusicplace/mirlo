import styled from "@emotion/styled";
// import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import { VscPlay } from "react-icons/vsc";
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
    padding: 0.8rem 0.7rem 0.9rem 0.9rem;

    &:nth-of-type(1) {
      margin-left: 0rem;
    }

    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.5);
    }
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 1;
  }

  @media (max-width: ${bp.small}px) {
    background-color: transparent !important;
    opacity: 1;
    width: 0.5rem;
    height: 2rem;
    right: 0rem;
    bottom: 0em;
    margin-right: 0.75rem;
    top: auto;
    position: absolute;

    button {
      font-size: 0.8rem;
      border-radius: 0px;
      border: solid 0px;
      background-color: rgba(0, 0, 0, 0.7);
      padding: 0.8rem 0.8rem 0.9rem 0.9rem;
      width: 2.4em;
      height: 2.4em;
      margin-bottom: 0;
    }
    button:active {
      font-size: 0.8rem;
      background-color: rgba(0, 0, 0, 0.7);
      padding: 0.8rem 0.8rem 0.9rem 0.9rem;
      width: 2.2em;
      height: 2.2em;
    }
    .startIcon {
      font-size: 1rem !important;
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
  trackId?: number;
  title: string;
  image?: { width: number; height: number; url: string };
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
          <Button
            onClick={onClickPlay}
            startIcon={<VscPlay />}
            compact
          ></Button>
        )}
        {/* {currentlyPlaying && (
          <Button onClick={onPause} startIcon={<TfiControlPause
            className={css`
                margin-right: .1rem;
                display: none;
                opacity: 0 !important;
            `}
          />} compact>

          </Button>
        )}*/}
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
