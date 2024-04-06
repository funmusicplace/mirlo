import React from "react";
import { css } from "@emotion/css";

import { bp } from "../../constants";
import { AudioWrapper } from "../AudioWrapper";
import Spinner from "../common/Spinner";
import { useGlobalStateContext } from "state/GlobalState";
import { isTrackOwnedOrPreview } from "utils/tracks";
import LoopButton from "../common/LoopButton";
import ShuffleButton from "../common/ShuffleButton";
import NextButton from "../common/NextButton";
import PreviousButton from "../common/PreviousButton";
import { isEmpty } from "lodash";
import { PlayControlButton } from "../common/PlayControlButton";
import PlayingTrackDetails from "./PlayingTrackDetails";
import useCurrentTrackHook from "./useCurrentTrackHook";
import styled from "@emotion/styled";
import { VolumeControl } from "./VolumeControl";
import { useAuthContext } from "state/AuthContext";

const ControlWrapper = styled.span`
  display: flex;
  align-items: center;

  button {
    color: black;
    background: transparent;
  }

  button:hover {
    color: var(--mi-white);
    background-color: var(--mi-white);
    font-size: 1.2rem;
  }

  @media (prefers-color-scheme: dark) {
    button {
      color: white;
    }
    button:hover {
      background-color: var(--mi-white) !important;
      color: var(--mi-black) !important;
      font-size: 1.2rem;
    }
  }

  @media (max-width: ${bp.small}px) {
    margin-right: 0.5rem;
    max-width: 50%;
  }
`;

const Player = () => {
  const { user } = useAuthContext();
  const { dispatch } = useGlobalStateContext();

  const [volume, setVolume] = React.useState(1);

  const { currentTrack, isLoading } = useCurrentTrackHook();

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

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: fixed;
        width: 100%;
        z-index: 10;
        bottom: 0;
        color: var(--mi-black);
        filter: drop-shadow(0 0 0.1rem rgba(0, 0, 0, 0.3));
        background-color: var(--mi-darken-x-background-color);
        // height: 73px;

        a {
          color: var(--mi-black);
        }

        @media (max-width: ${bp.small}px) {
          flex-direction: column;
        }

        @media (prefers-color-scheme: dark) {
          color: white;
          a {
            color: white;
          }
        }
      `}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-grow: 1;
          padding-bottom: 0.25rem;
          background-color: var(--mi-normal-background-color);

          @media (max-width: ${bp.small}px) {
            width: 100%;
            flex-grow: initial;
          }
        `}
      >
        {currentTrack && isTrackOwnedOrPreview(currentTrack, user) && (
          <AudioWrapper
            currentTrack={currentTrack}
            position="absolute"
            volume={volume}
          />
        )}
      </div>

      <div
        className={css`
          width: 100%;
          margin: auto;
          background-color: var(--mi-normal-background-color);

          @media (prefers-color-scheme: dark) {
            background-color: #0e0e0e;
          }
        `}
      >
        <div
          className={css`
            margin: 0 auto;
            display: flex;
            align-items: center;
            flex-grow: 1;
            paddin-right: 0.5rem;
            font-size: var(--mi-font-size-small);
            justify-content: space-between;
            background-color: #f5f0f0;

            @media (prefers-color-scheme: dark) {
              background-color: #0e0e0e;
            }

            @media (max-width: ${bp.small}px) {
              font-size: var(--mi-font-size-xsmall);
              flex-grow: initial;
              justify-content: space-between;
            }
          `}
        >
          <PlayingTrackDetails currentTrack={currentTrack} />

          <div
            className={css`
              display: inline-block;

              button {
                margin-right: 0.25rem;
              }
            `}
          >
            <ControlWrapper>
              <span
                className={css`
                  display: flex;
                  align-items: center;

                  @media (max-width: ${bp.small}px) {
                    display: none;
                  }
                `}
              >
                <LoopButton />

                <ShuffleButton />
              </span>
              <div
                className={css`
                  @media (max-width: ${bp.small}px) {
                    button {
                      padding: 0em 0.5em 0em 0em;
                      background: transparent;
                    }
                  }
                `}
              >
                <PreviousButton />
              </div>
              <PlayControlButton playerButton />
              <div
                className={css`
                @media (max-width: ${bp.small}px) {
                    button {
                      padding: 0em 0em 0em .5em;
                      background: transparent;
                    }
              `}
              >
                <NextButton />
              </div>
              <VolumeControl setVolume={setVolume} volume={volume} />
            </ControlWrapper>
          </div>
        </div>
        {!currentTrack && isLoading && <Spinner size="small" />}
      </div>
    </div>
  );
};

export default Player;
