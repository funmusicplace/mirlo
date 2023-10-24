import React from "react";
import { css } from "@emotion/css";
import { Helmet } from "react-helmet";

import { Link } from "react-router-dom";
import { bp } from "../constants";
import ImageWithPlaceholder from "./common/ImageWithPlaceholder";
import { AudioWrapper } from "./AudioWrapper";
import Spinner from "./common/Spinner";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import { isTrackOwnedOrPreview } from "utils/tracks";
import LoopButton from "./common/LoopButton";
import ShuffleButton from "./common/ShuffleButton";
import NextButton from "./common/NextButton";
import PauseButton from "./common/PauseButton";
import PlayButton from "./common/PlayButton";
import PreviousButton from "./common/PreviousButton";
import { isEmpty } from "lodash";

const playerClass = css`
  min-height: 90px;
  border-bottom: 1px solid grey;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  justify-content: space-between;
  position: fixed;
  width: 100%;
  z-index: 10;
  bottom: 0;
  filter: drop-shadow(0 0 0.1rem rgba(0, 0, 0, 0.5));
  background-color: var(--mi-normal-background-color);

  @media (max-width: ${bp.small}px) {
    // height: 140px;
    flex-direction: column;

    button {
      font-size: 1.2rem;
    }
  }
`;

const Player = () => {
  const {
    state: { playerQueueIds, currentlyPlayingIndex, user, playing },
    dispatch,
  } = useGlobalStateContext();
  // let navigate = useNavigate();
  const [currentTrack, setCurrentTrack] = React.useState<Track>();
  const [isLoading, setIsLoading] = React.useState(false);
  const userId = user?.id;

  const fetchTrackCallback = React.useCallback(
    async (id: number) => {
      setIsLoading(true);
      try {
        const { result } = await api.get<Track>(`tracks/${id}`);

        if (userId) {
          setCurrentTrack(result);
        } else {
          setCurrentTrack(result);
        }
      } catch {
        setCurrentTrack(undefined);
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  const currentTrackId = currentTrack?.id;
  const playerQueueIdAtIndex =
    currentlyPlayingIndex !== undefined &&
    playerQueueIds?.[currentlyPlayingIndex];

  const playerQueueIdsLength = playerQueueIds.length;

  // FIXME: Something is causing this to trigger twice and
  // call the above callback twice.
  React.useEffect(() => {
    if (playerQueueIdsLength && playerQueueIdAtIndex) {
      if (currentTrackId !== playerQueueIdAtIndex) {
        // setCurrentTrack(undefined);
        fetchTrackCallback(playerQueueIdAtIndex);
      }
    } else {
      setCurrentTrack(undefined);
    }
  }, [
    fetchTrackCallback,
    playerQueueIdsLength,
    playerQueueIdAtIndex,
    currentTrackId,
  ]);

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

  React.useEffect(() => {
    if (currentTrack) {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.trackGroup?.artist?.name ?? "",
          album: currentTrack.trackGroup?.title ?? "",
          artwork: [
            {
              src: currentTrack.trackGroup.cover?.url ?? "",
              type: "image/png",
            },
          ],
        });
      }
    }
  }, [currentTrack]);

  if (!currentTrack || isEmpty(currentTrack.trackGroup)) {
    return null;
  }

  return (
    <div className={playerClass}>
      <Helmet>
        <title>
          {currentTrack
            ? `${currentTrack.trackGroup?.artist?.name} - ${currentTrack.title}`
            : ""}
        </title>
      </Helmet>
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-grow: 1;
          margin-bottom: 0.25rem;

          @media (max-width: ${bp.small}px) {
            width: 100%;
            flex-grow: initial;
          }
        `}
      >
        {currentTrack && isTrackOwnedOrPreview(currentTrack, user) && (
          <AudioWrapper currentTrack={currentTrack} />
        )}
      </div>

      <div>
        <div
          className={css`
            display: flex;
            align-items: center;
            flex-grow: 1;
            margin-right: 0.5rem;
            font-size: 18px;
            justify-content: space-between;

            @media (max-width: ${bp.small}px) {
              width: 100%;
              flex-grow: initial;
              justify-content: space-between;
            }
          `}
        >
          <div
            className={css`
              display: flex;
              align-items: center;
              margin-right: 1rem;
              margin-bottom: 0.5rem;
            `}
          >
            <ImageWithPlaceholder
              src={currentTrack?.trackGroup.cover?.sizes?.[60]}
              size={60}
              alt={currentTrack?.title ?? "Loading album"}
              className={css`
                background-color: #efefef;
                margin-right: 0.5rem;
              `}
            />
            <div>
              <div>{currentTrack?.title}</div>
              {currentTrack?.trackGroup && (
                <>
                  <div>{currentTrack.trackGroup.title}</div>
                  <div>
                    <Link to={`/${currentTrack.trackGroup.artistId}`}>
                      {currentTrack.trackGroup.artist?.name}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* <TrackPopup trackId={currentTrack.id} compact /> */}
          <div
            className={css`
              display: inline-block;
              button {
                margin-right: 0.25rem;
              }
            `}
          >
            <span
              className={css`
                @media (max-width: ${bp.small}px) {
                  display: none;
                }
              `}
            >
              <ShuffleButton />
              <LoopButton />
            </span>
            <span>
              <PreviousButton />
              {!playing && <PlayButton />}
              {playing && <PauseButton />}
              <NextButton />
            </span>
          </div>
        </div>

        {!currentTrack && isLoading && <Spinner size="small" />}
      </div>
    </div>
  );
};

export default Player;
