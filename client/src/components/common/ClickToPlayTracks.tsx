import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { TfiControlPause } from "react-icons/tfi";
import { VscPlay } from "react-icons/vsc";
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
  playLabel?: "album" | "track";
}> = ({ trackIds, className, playLabel }) => {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const params = useParams();
  const { t } = useTranslation("translation", { keyPrefix: "clickToPlay" });

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: params.artistId ?? "" })
  );

  const onClickPlay = React.useCallback(async () => {
    dispatch({
      type: "startPlayingIds",
      playerQueueIds: trackIds,
    });
  }, [dispatch, trackIds]);

  const onClickPause = React.useCallback(async () => {
    dispatch({ type: "setPlaying", playing: false });
  }, [dispatch]);

  const currentlyPlaying =
    playing &&
    currentlyPlayingIndex !== undefined &&
    trackIds.includes(playerQueueIds[currentlyPlayingIndex]);

  if (!artist) {
    return null;
  }

  if (playLabel) {
    return (
      <ArtistButton
        startIcon={currentlyPlaying ? <TfiControlPause /> : <VscPlay />}
        onClick={currentlyPlaying ? onClickPause : onClickPlay}
        disabled={trackIds.length === 0}
        className={
          css`
            width: 70%;
            justify-content: center;
            border-radius: 9999px !important;
          ` + (className ? ` ${className}` : "")
        }
      >
        {currentlyPlaying
          ? t("pause")
          : t(playLabel === "album" ? "playAlbum" : "playTrack")}
      </ArtistButton>
    );
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
