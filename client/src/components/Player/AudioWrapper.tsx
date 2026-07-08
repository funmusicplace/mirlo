import Hls, { HlsConfig } from "hls.js";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";

import SongTimeDisplay from "../common/SongTimeDisplay";

import BuyTrackModal from "./BuyTrackModal";
import { PlayLimit } from "./PlayLimitNotice";

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
  compact?: boolean;
  onPlayLimitChange?: (limit: PlayLimit | null) => void;
}> = ({
  currentTrack,
  position,
  volume = 1,
  setCurrentSeconds,
  currentSeconds,
  compact,
  onPlayLimitChange,
}) => {
  const [showBuyModal, setShowBuyModal] = React.useState(false);
  const [hasShownBuyModalBeenShown, setHasShownBuyModalBeenShown] =
    React.useState(false);
  const [hasOverplayedSong, setHasOverplayedSong] = React.useState(false);
  const {
    state: { playerQueueIds, currentlyPlayingIndex, playing, looping },
    dispatch,
  } = useGlobalStateContext();
  const [mostlyListened, setMostlyListened] = React.useState(false);
  const playerRef = React.useRef<HTMLVideoElement>(null);
  const playingRef = React.useRef(playing);
  const showBuyModalRef = React.useRef(showBuyModal);
  React.useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  React.useEffect(() => {
    showBuyModalRef.current = showBuyModal;
  }, [showBuyModal]);

  const onHLSInstance = React.useCallback(
    (hls: Hls) => {
      hls.once(Hls.Events.MANIFEST_PARSED, () => {
        if (playingRef.current && !showBuyModalRef.current) {
          playerRef.current?.play().catch(() => {
            dispatch({ type: "setPlaying", playing: false });
          });
        }
      });
    },
    [dispatch]
  );

  const onEnded = React.useCallback(async () => {
    if (looping === "loopTrack") {
      playerRef.current?.play().catch(() => {
        dispatch({ type: "setPlaying", playing: false });
      });
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
      onPlayLimitChange?.(null);
    }
  }, [currentTrack.id]);

  // Once the listener buys the album from the buy modal the play limit no
  // longer applies, but the player otherwise stays stuck on the overplayed
  // state (the modal keeps reappearing and playback won't resume). Clear that
  // state so playback can continue when they return to the track (#1630).
  const onPurchaseComplete = React.useCallback(() => {
    setShowBuyModal(false);
    setHasOverplayedSong(false);
    setHasShownBuyModalBeenShown(false);
    onPlayLimitChange?.(null);
  }, [onPlayLimitChange]);

  const onListen = React.useCallback(
    async (e: any) => {
      // setCurrentTime(fmtMSS(e.target.currentTime.toFixed()));
      if (!mostlyListened && currentTrack && e.target.currentTime > 45) {
        setMostlyListened(true);
        try {
          const resp = await api.get<{ playLimit: PlayLimit | null }>(
            `tracks/${currentTrack.id}/trackPlay`
          );
          onPlayLimitChange?.(resp.result?.playLimit ?? null);
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
            playerRef.current.play().catch(() => {
              dispatch({ type: "setPlaying", playing: false });
            });
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
              src: currentTrack.trackGroup.cover?.sizes?.[120] ?? "",
              sizes: "96x96",
              type: "image/png",
            },
            {
              src: currentTrack.trackGroup.cover?.sizes?.[120] ?? "",
              sizes: "128x128",
              type: "image/png",
            },
            {
              src: currentTrack.trackGroup.cover?.sizes?.[300] ?? "",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: currentTrack.trackGroup.cover?.sizes?.[300] ?? "",
              sizes: "256x256",
              type: "image/png",
            },
            {
              src: currentTrack.trackGroup.cover?.sizes?.[600] ?? "",
              sizes: "384x384",
              type: "image/png",
            },
            {
              src: currentTrack.trackGroup.cover?.sizes?.[600] ?? "",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: currentTrack.trackGroup.cover?.sizes?.[1200] ?? "",
              sizes: "1200x1200",
              type: "image/png",
            },
          ],
        });
        navigator.mediaSession.setActionHandler("play", () =>
          dispatch({ type: "setPlaying", playing: true })
        );
        navigator.mediaSession.setActionHandler("pause", () =>
          dispatch({ type: "setPlaying", playing: false })
        );
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
        trackGroupId={currentTrack.trackGroupId}
        onPurchaseComplete={onPurchaseComplete}
      />
      <React.Suspense fallback={null}>
        <ReactHlsPlayer
          src={streamUrl}
          autoPlay={false}
          style={{ display: "none" }}
          // controls={true}
          // @ts-ignore
          hlsConfig={hlsConfig}
          getHLSInstance={onHLSInstance}
          onError={(event: any, data: any) => {
            if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
              const status = data.networkDetails?.status;
              const responseText = data.networkDetails?.responseText ?? "";
              const isPlayLimitExceeded =
                status === 402 ||
                responseText.includes("Track play limit exceeded");
              if (isPlayLimitExceeded && !hasShownBuyModalBeenShown) {
                setHasOverplayedSong(true);
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
      </React.Suspense>
      <SongTimeDisplay
        playerRef={playerRef}
        currentSeconds={currentSeconds}
        position={position}
        compact={compact}
      />
    </>
  );
};
