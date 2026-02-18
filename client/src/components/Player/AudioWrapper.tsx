// import { css } from "@emotion/css";

import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import SongTimeDisplay from "../common/SongTimeDisplay";
import { useAuthContext } from "state/AuthContext";
import BuyTrackModal from "./BuyTrackModal";
import Hls, { HlsConfig } from "hls.js";

// Load react-hls-player asynchronously (the hls bundle is quite big)
const ReactHlsPlayer = React.lazy(() => import("@mirlo/react-hls-player"));

const hlsConfig: Partial<HlsConfig> = {
  xhrSetup: function (xhr: XMLHttpRequest, url: string) {
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.withCredentials = true;
  },
  autoStartLoad: false,
  maxBufferLength: 60,
  fragLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 120000,
      timeoutRetry: {
        maxNumRetry: 4,
        retryDelayMs: 1000,
        maxRetryDelayMs: 0,
      },
      errorRetry: {
        maxNumRetry: 6,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000,
      },
    },
  },
};

export const AudioWrapper: React.FC<{
  currentTrack: Track;
  position: string;
  volume?: number;
  setCurrentSeconds: (time: number) => void;
  currentSeconds: number;
}> = ({
  currentTrack,
  position,
  volume = 1,
  setCurrentSeconds,
  currentSeconds,
}) => {
  const [showBuyModal, setShowBuyModal] = React.useState(false);
  const [hasShownBuyModalBeenShown, setHasShownBuyModalBeenShown] =
    React.useState(false);
  const [hasOverplayedSong, setHasOverplayedSong] = React.useState(false);
  const {
    state: { playerQueueIds, currentlyPlayingIndex, playing, looping },
    dispatch,
  } = useGlobalStateContext();
  const { user } = useAuthContext();
  const [mostlyListened, setMostlyListened] = React.useState(false);
  const userId = user?.id;
  const playerRef = React.useRef<HTMLVideoElement>(null);

  const onEnded = React.useCallback(async () => {
    if (looping === "loopTrack") {
      playerRef.current?.play();
    } else {
      dispatch({ type: "incrementCurrentlyPlayingIndex" });
    }
    setMostlyListened(false);
  }, [playerRef, dispatch, looping]);

  React.useEffect(() => {
    if (currentTrack) {
      setMostlyListened(false);
      setHasOverplayedSong(false);
      setHasShownBuyModalBeenShown(false);
    }
  }, [currentTrack.id]);

  const onListen = React.useCallback(
    async (e: any) => {
      // setCurrentTime(fmtMSS(e.target.currentTime.toFixed()));
      if (!mostlyListened && currentTrack && e.target.currentTime > 45) {
        setMostlyListened(true);
        try {
          await api.get(`tracks/${currentTrack.id}/trackPlay`);
        } catch (e) {
          console.error(e);
        }
      }
      setHasShownBuyModalBeenShown(false);
      setCurrentSeconds(e.target.currentTime);
    },
    [currentTrack, mostlyListened]
  );

  const determineIfShouldPlay = React.useCallback(() => {
    try {
      if (
        currentTrack &&
        currentlyPlayingIndex !== undefined &&
        currentTrack.id === playerQueueIds[currentlyPlayingIndex] &&
        playing
      ) {
        if (playerRef?.current) {
          if (hasOverplayedSong && !hasShownBuyModalBeenShown) {
            setShowBuyModal(true);
            setHasShownBuyModalBeenShown(true);
            if (playerRef.current) {
              playerRef.current.pause();
            }
          } else {
            playerRef.current.setAttribute("muted", "");
            playerRef.current.playsInline = true;
            playerRef.current.play();
          }
        }
      } else if (playerRef?.current && playing === false) {
        if (playerRef?.current) {
          playerRef.current.playsInline = true;
          playerRef.current.pause();
        }
      }
    } catch (e) {
      console.error("an error happened", e);
    }
  }, [currentTrack, currentlyPlayingIndex, playerQueueIds, playerRef, playing]);

  React.useEffect(() => {
    determineIfShouldPlay();
  }, [determineIfShouldPlay]);

  React.useEffect(() => {
    if (currentTrack) {
      if ("mediaSession" in navigator) {
        const artist = currentTrack.trackArtists
          ?.filter((ta) => ta.isCoAuthor)
          .map((ta) => ta.artistName)
          .join(", ");

        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: (artist || currentTrack.trackGroup?.artist?.name) ?? "",
          album: currentTrack.trackGroup?.title ?? "",
          artwork: [
            {
              src: currentTrack.trackGroup.cover?.sizes?.[1200] ?? "",
              type: "image/jpeg",
              sizes: "1200x1200",
            },
          ],
        });
        navigator.mediaSession.setActionHandler("previoustrack", () =>
          dispatch({ type: "decrementCurrentlyPlayingIndex" })
        );
        navigator.mediaSession.setActionHandler("nexttrack", () =>
          dispatch({ type: "incrementCurrentlyPlayingIndex" })
        );

        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (playerRef.current && details.seekTime) {
            playerRef.current.currentTime = details.seekTime;
          }
        });
      }
    }
  }, [currentTrack, dispatch]);

  const streamUrl = api.streamUrl(currentTrack);

  const onPlay = React.useCallback(async () => {
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch]);

  React.useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = volume;
    }
  }, [volume]);

  if (!streamUrl) {
    return null;
  }

  return (
    <>
      <BuyTrackModal
        showBuyModal={showBuyModal}
        setShowBuyModal={setShowBuyModal}
        trackId={currentTrack.id}
        trackGroupId={currentTrack.trackGroupId}
      />
      <ReactHlsPlayer
        src={streamUrl}
        autoPlay={false}
        style={{ display: "none" }}
        // controls={true}
        // @ts-ignore
        hlsConfig={hlsConfig}
        onError={(event: any, data: any) => {
          if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
            if (data.networkDetails?.responseText) {
              if (
                data.networkDetails.responseText.includes(
                  "Track play limit exceeded"
                ) &&
                !hasShownBuyModalBeenShown
              ) {
                setHasOverplayedSong(true);
              }
            }
          }
        }}
        width="100%"
        height="2rem"
        onPlay={onPlay}
        onEnded={onEnded}
        playerRef={playerRef}
        onTimeUpdate={onListen}
        playsInline
      />
      <SongTimeDisplay
        playerRef={playerRef}
        currentSeconds={currentSeconds}
        position={position}
      />
    </>
  );
};
