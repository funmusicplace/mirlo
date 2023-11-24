import styled from "@emotion/styled";
import React from "react";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";

import PlayControlButton from "./PlayControlButton";
type WrapperProps = {
  width: number;
  height: number;
};

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

  @media (max-width: ${bp.medium}px) {
    position: relative;
  }
`;

const ClickToPlayAlbum: React.FC<{
  trackGroupId: number;
  image?: { width: number; height: number; url: string };
  className?: string;
}> = ({ trackGroupId, image, className }) => {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const [trackIds, setTrackIds] = React.useState<number[]>([]);

  React.useEffect(() => {
    const callback = async () => {
      const { result } = await api.get<TrackGroup>(
        `trackGroups/${trackGroupId}`
      );
      const ids = result.tracks
        .filter((item) => item.isPreview)
        .map((item) => item.id);
      setTrackIds(ids);
    };
    callback();
  }, [trackGroupId]);

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
    <Wrapper
      width={image?.width ?? 0}
      height={image?.height ?? 0}
      className={className}
    >
      <PlayControlButton onPlay={onClickPlay} isPlaying={currentlyPlaying} />
    </Wrapper>
  );
};

export default ClickToPlayAlbum;
