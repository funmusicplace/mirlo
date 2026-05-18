import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { isEmpty } from "lodash";
import React from "react";
import { createPortal } from "react-dom";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
import { useBroadcastPlayerSync } from "utils/playerSync";
import { isTrackOwnedOrPreview } from "utils/tracks";

import { bp } from "../../constants";
import { useIsArtistPageLight } from "../ArtistColorsProvider";
import LoopButton from "../common/LoopButton";
import NextButton from "../common/NextButton";
import { PlayControlButton } from "../common/PlayControlButton";
import PreviousButton from "../common/PreviousButton";
import ShuffleButton from "../common/ShuffleButton";
import Spinner from "../common/Spinner";
import { ElapsedTime } from "../Widget/utils";

import { AudioWrapper } from "./AudioWrapper";
import PlayerActions from "./PlayerActions";
import PlayingTrackDetails from "./PlayingTrackDetails";
import { PlayLimit, PlayLimitText } from "./PlayLimitNotice";
import useCurrentTrackHook from "./useCurrentTrackHook";
import { VolumeControl } from "./VolumeControl";

const ControlWrapper = styled.span`
  display: flex;
  align-items: center;

  button {
    margin-right: 0.6rem;
  }

  @media (max-width: ${bp.small}px) {
    margin-right: 0.5rem;
    max-width: 50%;
  }
`;

const Player = () => {
  const { user } = useAuthContext();
  const { state, dispatch } = useGlobalStateContext();

  const [volume, setVolume] = React.useState(1);
  const { currentTrack, isLoading } = useCurrentTrackHook();
  const [currentSeconds, setCurrentSeconds] = React.useState(0);
  const [playLimit, setPlayLimit] = React.useState<PlayLimit | null>(null);
  const mountId = React.useId();
  const isArtistPageLight = useIsArtistPageLight();
  const tone =
    isArtistPageLight === true
      ? "light"
      : isArtistPageLight === false
        ? "dark"
        : undefined;

  useBroadcastPlayerSync(
    React.useMemo(
      () => ({
        playing: !!state.playing,
        currentTrackId: currentTrack?.id ?? null,
        currentSeconds: Math.floor(currentSeconds),
      }),
      [state.playing, currentTrack?.id, currentSeconds]
    )
  );

  React.useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        dispatch({ type: "incrementCurrentlyPlayingIndex" });
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        dispatch({ type: "decrementCurrentlyPlayingIndex" });
      });
    }
  }, [dispatch]);

  if (!currentTrack || isEmpty(currentTrack.trackGroup)) {
    return null;
  }

  // Portal to document.body is there to prevent the Player from using #artist-colors-root's CSS
  // var cascade. Keeps a neutral Mirlo palette regardless of artist page.
  return createPortal(
    <div
      data-tone={tone}
      className={css`
        --mi-fixed-bg-color: var(--mi-off-white);
        --mi-fixed-fg-color: var(--mi-black);

        &[data-tone="dark"] {
          --mi-fixed-bg-color: var(--mi-black);
          --mi-fixed-fg-color: var(--mi-off-white);
        }
      `}
    >
      <PlayerActions />
      <div
        className={css`
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: fixed;
          width: 100%;
          z-index: 10;
          bottom: 0;
          filter: drop-shadow(
            0 0 0.1rem
              color-mix(in srgb, var(--mi-fixed-fg-color) 30%, transparent)
          );

          background-color: var(--mi-darken-x-background-color);

          --player-link: var(--mi-fixed-fg-color);
          --player-icon: currentColor;
          --player-control-border: none;

          @media (max-width: ${bp.small}px) {
            flex-direction: column;
          }
        `}
        id="player"
        data-mount-id={mountId}
      >
        <div
          className={css`
            width: 100%;
            margin: auto;
            background-color: var(--mi-fixed-bg-color);
            color: var(--mi-fixed-fg-color);
          `}
        >
          {currentTrack && isTrackOwnedOrPreview(currentTrack, user) && (
            <AudioWrapper
              currentTrack={currentTrack}
              position="absolute"
              volume={volume}
              setCurrentSeconds={setCurrentSeconds}
              currentSeconds={currentSeconds}
              onPlayLimitChange={setPlayLimit}
            />
          )}
          <div
            className={css`
              margin: 0 auto;
              display: flex;
              align-items: center;
              flex-grow: 1;
              paddin-right: 0.5rem;
              font-size: var(--mi-font-size-small);
              justify-content: space-between;

              @media (max-width: ${bp.small}px) {
                font-size: var(--mi-font-size-xsmall);
                flex-grow: initial;
                justify-content: space-between;
              }

              a {
                color: var(--player-link);
              }
            `}
          >
            <PlayingTrackDetails
              currentTrack={currentTrack}
              byLineEnd={
                <>
                  <ElapsedTime
                    current={currentSeconds}
                    total={currentTrack.audio?.duration}
                  />
                  {playLimit && (
                    <PlayLimitText playLimit={playLimit} hideLastPlay short />
                  )}
                </>
              }
            />

            <div
              className={css`
                display: inline-flex;
                align-items: center;
                button {
                  margin-right: 0.25rem;
                }

                @media (max-width: ${bp.small}px) {
                  .tip-artist,
                  .wishlist {
                    display: none;
                  }
                }
              `}
            >
              <div className="max-sm:hidden! flex flex-col items-end shrink-0 mr-4">
                <small
                  aria-hidden
                  className="text-[0.65rem] leading-none invisible"
                >
                  .
                </small>
                <span className="whitespace-nowrap inline-block min-w-12 text-right">
                  <ElapsedTime
                    current={currentSeconds}
                    total={currentTrack.audio?.duration}
                  />
                </span>
                {playLimit ? (
                  <PlayLimitText playLimit={playLimit} />
                ) : (
                  <small
                    aria-hidden
                    className="text-[0.65rem] leading-none invisible"
                  >
                    .
                  </small>
                )}
              </div>

              <ControlWrapper>
                <span
                  className={css`
                    display: flex;
                    align-items: center;

                    @media (max-width: ${bp.small}px) {
                      display: none;
                    }

                    button {
                      color: var(--mi-fixed-fg-color);
                      border: var(--player-control-border);
                    }
                  `}
                >
                  <LoopButton />

                  <ShuffleButton />
                </span>
                <div
                  className={css`
                    button svg {
                      fill: var(--player-icon);
                    }
                  `}
                >
                  <PreviousButton />
                </div>
                <PlayControlButton playerButton />
                <div
                  className={css`
                    button svg {
                      fill: var(--player-icon);
                    }
                  `}
                >
                  <NextButton />
                </div>
                <div
                  className={css`
                    button svg {
                      fill: var(--player-icon);
                    }
                  `}
                >
                  <VolumeControl setVolume={setVolume} volume={volume} />
                </div>
              </ControlWrapper>
            </div>
          </div>
          {!currentTrack && isLoading && <Spinner size="small" />}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Player;
