import { css } from "@emotion/css";

import React from "react";
import ReactHlsPlayer from "@gumlet/react-hls-player";
import api from "services/api";

import { useGlobalStateContext } from "state/GlobalState";
import { fmtMSS } from "utils/tracks";
import NextButton from "./common/NextButton";
import PreviousButton from "./common/PreviousButton";
import PlayButton from "./common/PlayButton";
import PauseButton from "./common/PauseButton";
import SongTimeDisplay from "./common/SongTimeDisplay";
import { bp } from "../constants";

const hlsConfig = {
  xhrSetup: function (xhr: XMLHttpRequest, url: string) {
    // const { token } = getToken();
    // FIXME: need to set cookies on the xhr for the hls
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.withCredentials = true;
    // xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  },
};

export const AudioWrapper: React.FC<{
  currentTrack: Track;
  hideControls?: boolean;
}> = ({ currentTrack, hideControls = false }) => {
  const {
    state: { playerQueueIds, currentlyPlayingIndex, user, playing, looping },
    dispatch,
  } = useGlobalStateContext();
  const [currentTime, setCurrentTime] = React.useState("0:00");
  const playerRef = React.useRef<HTMLVideoElement>(null);
  const [mostlyListened, setMostlyListened] = React.useState(false);
  const userId = user?.id;

  const onEnded = React.useCallback(async () => {
    if (looping === "loopTrack") {
      playerRef.current?.play();
    } else {
      dispatch({ type: "incrementCurrentlyPlayingIndex" });
    }
    setMostlyListened(false);
  }, [dispatch, looping]);

  const onListen = React.useCallback(
    async (e: any) => {
      setCurrentTime(fmtMSS(e.target.currentTime.toFixed()));
      if (
        !mostlyListened &&
        currentTrack &&
        userId &&
        e.target.currentTime > 45
      ) {
        setMostlyListened(true);
        try {
          // const result = await registerPlay(currentTrack.id);
          // dispatch({ type: "setUserCredits", credits: result.total });
        } catch (e) {
          console.error(e);
        }
      }
    },
    [currentTrack, mostlyListened, userId]
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
          playerRef.current.setAttribute("muted", "");
          playerRef.current.playsInline = true;
          playerRef.current.play();
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
  }, [currentTrack, currentlyPlayingIndex, playerQueueIds, playing]);

  React.useEffect(() => {
    determineIfShouldPlay();
  }, [determineIfShouldPlay]);

  const streamUrl = api.streamUrl(currentTrack);

  const onPlay = React.useCallback(() => {
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch]);

  if (!streamUrl) {
    return null;
  }

  return (
    <>
      <>
        {!hideControls && (
          <div
            className={css`
              display: flex;

              button {
                margin-right: 0.25rem;
              }
            `}
          >
            <>
              <PreviousButton />
              {!playing && <PlayButton />}
              {playing && <PauseButton />}
              <NextButton />
            </>
          </div>
        )}

        <ReactHlsPlayer
          src={streamUrl}
          autoPlay={false}
          style={{ display: "none" }}
          // controls={true}
          // @ts-ignore
          hlsConfig={hlsConfig}
          width="100%"
          height="2rem"
          onPlay={onPlay}
          onEnded={onEnded}
          playerRef={playerRef}
          onTimeUpdate={onListen}
          playsInline
        />
        <SongTimeDisplay playerRef={playerRef} />
      </>
      <div
        className={css`
          width: 100px;
          text-align: right;
          font-family: mono;

          @media (max-width: ${bp.small}px) {
            display: none;
          }
        `}
      >
        {currentTime}
      </div>
    </>
  );
};
