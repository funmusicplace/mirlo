import styled from "@emotion/styled";
// import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import { VscPlay } from "react-icons/vsc";
// import { TfiControlPause } from "react-icons/tfi";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import Button from "./Button";
import { css } from "@emotion/css";
import PauseButton from "../common/PauseButton";
type WrapperProps = {
  width: number;
  height: number;
};

const PlayWrapper = styled.div<WrapperProps>`
  opacity: 1;
  color: white;
  border: 0;
  transition: 0.5s;

  .startIcon {
    margin-right: 0rem !important;
  }

  button {
    background-color: var(--mi-secondary-color);
    color: var(--mi-primary-color);
    width: 3rem;
    height: 3rem;
    border-radius: 50px;
    font-size: 1rem;
    padding: 0.8rem 0.7rem 0.9rem 0.9rem;
    border: 0px !important;
    margin: 0 !important;

    &:nth-of-type(1) {
      margin-left: 0rem;
    }

    &:hover:not(:disabled) {
      background-color: var(--mi-primary-color);
      color: var(--mi-secondary-color);
    }
  }

  &:hover {
    opacity: 1;
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
  }

  @media (max-width: ${bp.medium}px) {
    position: relative;
  }
`;

const ClickToPlayAlbum: React.FC<{
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

  const onPause = React.useCallback(
    (e: any) => {
      // onPause gets triggered both onEnded and onPause, so we need
      // a way to differntiate those.
      if (!isEqualDurations(e.target.currentTime, e.target.duration)) {
        dispatch({ type: "setPlaying", playing: false });
      }
    },
    [dispatch]
  );

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
        {currentlyPlaying && (
          <div
            className={css`
              button {
                width: 3rem !important;
                height: 3rem !important;
                font-size: 1.4rem !important;
                padding-left: 0.8rem !important;
              }
            `}
          >
            <PauseButton />
          </div>
        )}

        {/* {currentlyPlaying && (
          <Button
            onClick={onPause}
            startIcon={
              <TfiControlPause
                className={css`
                  margin-right: 0.2rem;
                  margin-top: 0.1rem;
                `}
              />
            }
            compact
          ></Button>
        )}
        <Button onClick={onClickQueue} startIcon={<MdQueue />} compact>
          Queue
        </Button> */}
      </PlayWrapper>
      {/* }{currentlyPlaying && (
        <PlayingMusicBars
          width={image?.width ?? 0}
          height={image?.height ?? 0}
        />
      )}*/}
    </Wrapper>
  );
};

export default ClickToPlayAlbum;
