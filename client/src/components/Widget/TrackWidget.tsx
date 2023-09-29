import { css } from "@emotion/css";
import { AudioWrapper } from "components/AudioWrapper";
// import { AudioWrapper } from "components/AudioWrapper";
// import ClickToPlay from "components/common/ClickToPlay";
import IconButton from "components/common/IconButton";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import SmallTileDetails from "components/common/SmallTileDetails";
import React from "react";
import { FaPause, FaPlay } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { isTrackOwnedOrPreview } from "utils/tracks";

function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function inMirlo() {
  try {
    return window.top?.location.origin === process.env.REACT_APP_CLIENT_DOMAIN;
  } catch (e) {
    return false;
  }
}

const TrackWidget = () => {
  const params = useParams();
  const {
    state: { playing, user },
    dispatch,
  } = useGlobalStateContext();

  const [track, setTrack] = React.useState<Track>();
  const [isLoading, setIsLoading] = React.useState(true);

  const embeddedInMirlo = inIframe() && inMirlo();

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      try {
        const results = await api.get<Track>(`tracks/${params.id}`);
        setTrack(results.result);
      } catch (e) {
        console.error("e", e);
      } finally {
        setIsLoading(false);
      }
    };

    callback();
  }, [params.id]);

  const onPause = React.useCallback(
    (e: any) => {
      if (track && embeddedInMirlo) {
        window.parent.postMessage("mirlo:pause:track:" + track.id);
      } else {
        dispatch({ type: "setPlaying", playing: false });
      }
    },
    [dispatch, embeddedInMirlo, track]
  );

  const playMusic = React.useCallback(() => {
    if (track) {
      if (embeddedInMirlo) {
        window.parent.postMessage("mirlo:play:track:" + track.id);
      } else {
        dispatch({ type: "setPlaying", playing: true });
      }
    }
  }, [track, dispatch, embeddedInMirlo]);

  return (
    <>
      {!track && !isLoading && (
        <div
          className={css`
            display: flex;
            width: 100%;
            justify-content: center;
            padding: 1rem;
          `}
        >
          That track doesn't exist
        </div>
      )}
      {track && (
        <div
          className={css`
            display: flex;
            padding: 1rem;
            background: var(--mi-normal-background-color);
            border-radius: 1rem;
            align-items: center;
            height: 100%;
            box-sizing: border-box;
          `}
        >
          <ImageWithPlaceholder
            src={track.trackGroup.cover?.sizes?.[120] ?? ""}
            alt={track.title}
            size={120}
          />

          <SmallTileDetails
            title={track.title}
            subtitle={track.trackGroup.title}
            footer={track.trackGroup.artist.name}
          />

          {isTrackOwnedOrPreview(track, user) && (
            <>
              {!playing && (
                <IconButton
                  onClick={playMusic}
                  className={
                    playing || embeddedInMirlo
                      ? css`
                          margin-right: 0.5rem;
                        `
                      : ""
                  }
                >
                  <FaPlay />
                </IconButton>
              )}
              {(playing || embeddedInMirlo) && (
                <IconButton onClick={onPause}>
                  <FaPause />
                </IconButton>
              )}
            </>
          )}
        </div>
      )}
      {track && !embeddedInMirlo && (
        <div
          className={css`
            display: flex;
            align-items: center;
            width: 100%;
            padding: 0 1rem;

            & > div {
              max-width: ;
            }
          `}
        >
          <AudioWrapper currentTrack={track} hideControls />
        </div>
      )}
    </>
  );
};

export default TrackWidget;
