import React from "react";
import { css } from "@emotion/css";

import { bp } from "../../constants";
import { AudioWrapper } from "./AudioWrapper";
import Spinner from "../common/Spinner";
import { useGlobalStateContext } from "state/GlobalState";
import { fmtMSS, isTrackOwnedOrPreview } from "utils/tracks";
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
import Wishlist from "components/TrackGroup/Wishlist";
import TipArtist from "components/common/TipArtist";

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
  const { dispatch } = useGlobalStateContext();

  const [volume, setVolume] = React.useState(1);
  const { currentTrack, isLoading } = useCurrentTrackHook();
  const [currentSeconds, setCurrentSeconds] = React.useState(0);

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
        filter: drop-shadow(0 0 0.1rem rgba(0, 0, 0, 0.3));

        background-color: var(--mi-darken-x-background-color);

        @media (max-width: ${bp.small}px) {
          flex-direction: column;
        }
      `}
      id="player"
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-grow: 1;

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
            setCurrentSeconds={setCurrentSeconds}
            currentSeconds={currentSeconds}
          />
        )}
      </div>

      <div
        className={css`
          width: 100%;
          margin: auto;
          background-color: var(--mi-off-white);
          color: var(--mi-black);

          @media (prefers-color-scheme: dark) {
            background-color: var(--mi-black);
            color: var(--mi-off-white);
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

            @media (max-width: ${bp.small}px) {
              font-size: var(--mi-font-size-xsmall);
              flex-grow: initial;
              justify-content: space-between;
            }

            @media (prefers-color-scheme: dark) {
              a {
                color: lightgrey;
              }
            }
          `}
        >
          <PlayingTrackDetails currentTrack={currentTrack} />

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
            <span
              className={css`
                display: inline-block;
                min-width: 3rem;
                text-align: right;
                margin-right: 1rem;
              `}
            >
              {fmtMSS(currentSeconds)}
            </span>

            <ControlWrapper>
              <span
                className={css`
                  display: flex;
                  align-items: center;

                  @media (max-width: ${bp.small}px) {
                    display: none;
                  }

                  @media (prefers-color-scheme: dark) {
                    button {
                      color: lightgrey;
                      border: solid 1px grey;
                    }
                  }
                `}
              >
                <LoopButton />

                <ShuffleButton />
              </span>
              <div
                className={css`
                  @media (prefers-color-scheme: dark) {
                    button {
                      svg {
                        fill: lightgrey;
                      }
                    }
                  }
                `}
              >
                <PreviousButton />
              </div>
              <PlayControlButton playerButton />
              <div
                className={css`
                  @media (prefers-color-scheme: dark) {
                    button {
                      svg {
                        fill: lightgrey;
                      }
                    }
                  }
                `}
              >
                <NextButton />
              </div>
              <div
                className={css`
                  @media (prefers-color-scheme: dark) {
                    button {
                      svg {
                        fill: lightgrey;
                      }
                    }
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
  );
};

export default Player;
