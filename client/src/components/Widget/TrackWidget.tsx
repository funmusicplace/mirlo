import { css } from "@emotion/css";
import { AudioWrapper } from "components/AudioWrapper";
// import { AudioWrapper } from "components/AudioWrapper";
// import ClickToPlay from "components/common/ClickToPlay";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import PauseButton from "components/common/PauseButton";
import PlayButton from "components/common/PlayButton";
import SmallTileDetails from "components/common/SmallTileDetails";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";

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
  } = useGlobalStateContext();

  const [track, setTrack] = React.useState<Track>();
  const [isLoading, setIsLoading] = React.useState(true);
  const { t } = useTranslation("translation", { keyPrefix: "trackDetails" });
  const { t: artistTranslation } = useTranslation("translation", {
    keyPrefix: "artist",
  });

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

  return (
    <>
      {(!track || !track.id) && !isLoading && (
        <div
          className={css`
            border: var(--mi-border);
            display: flex;
            width: 100%;
            justify-content: center;
            padding: 1rem;
          `}
        >
          {t("trackDoesntExist")}
        </div>
      )}
      {track?.id && (
        <div
          className={css`
            border: var(--mi-border);
            display: flex;
            padding: 1rem;
            background: var(--mi-normal-background-color);
            border-radius: 1rem;
            align-items: center;
            height: 100%;
            box-sizing: border-box;
          `}
        >
          <MetaCard
            title={`${track.title} by ${
              track.trackGroup.artist?.name ?? "Unknown"
            }`}
            description={track.trackGroup.title}
            image={track.trackGroup.cover?.sizes?.[300]}
            player={widgetUrl(track.id)}
          />
          <ImageWithPlaceholder
            src={track.trackGroup.cover?.sizes?.[300] ?? ""}
            alt={track.title}
            size={120}
          />

          <SmallTileDetails
            title={track.title}
            subtitle={track.trackGroup.title}
            footer={
              track.trackGroup.artist?.name ??
              (artistTranslation("unknown") as string)
            }
          />

          {isTrackOwnedOrPreview(track, user) && (
            <>
              {!playing && (
                <PlayButton
                  className={
                    playing || embeddedInMirlo
                      ? css`
                          margin-right: 0.5rem;
                        `
                      : ""
                  }
                />
              )}
              {(playing || embeddedInMirlo) && <PauseButton />}
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
          <AudioWrapper currentTrack={track} hideControls position="relative" />
        </div>
      )}
    </>
  );
};

export default TrackWidget;
