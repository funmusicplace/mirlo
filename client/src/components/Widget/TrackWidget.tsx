import { css } from "@emotion/css";
import { AudioWrapper } from "components/AudioWrapper";
// import { AudioWrapper } from "components/AudioWrapper";
// import ClickToPlay from "components/common/ClickToPlay";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import SmallTileDetails from "components/common/SmallTileDetails";
import React from "react";
import { useTranslation } from "react-i18next";

import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";
import { FlexWrapper, WidgetWrapper, inIframe, inMirlo } from "./utils";
import { PlayButtonsWrapper } from "./PlayButtonsWrapper";
import DisplayAudioWrapper from "./DisplayAudio";

const TrackWidget = () => {
  const params = useParams();
  const {
    state: { user },
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
            ${embeddedInMirlo && "min-height: 154px;"}
            ${!embeddedInMirlo && "min-height: 169px;"}
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
        <WidgetWrapper>
          <MetaCard
            title={`${track.title} by ${
              track.trackGroup.artist?.name ?? "Unknown"
            }`}
            description={"A track on Mirlo"}
            image={track.trackGroup.cover?.sizes?.[300]}
            player={widgetUrl(track.id, "track")}
          />
          <FlexWrapper
            className={css`
              align-items: center;
              height: 135px;
            `}
          >
            <ImageWithPlaceholder
              src={track.trackGroup.cover?.sizes?.[300] ?? ""}
              alt={track.title}
              size={135}
            />

            <div
              className={css`
                width: 100%;
                min-width: 30%;
              `}
            >
              <SmallTileDetails
                title={track.title}
                subtitle={track.trackGroup.title}
                footer={
                  track.trackGroup.artist?.name ??
                  (artistTranslation("unknown") as string)
                }
              />
            </div>
            {isTrackOwnedOrPreview(track, user) && (
              <div
                className={css`
                  padding-right: 2%;
                `}
              >
                <PlayButtonsWrapper ids={[track.id]} />
              </div>
            )}
          </FlexWrapper>
          {track && !embeddedInMirlo && (
            <DisplayAudioWrapper>
              <AudioWrapper
                currentTrack={track}
                hideControls
                position="relative"
              />
            </DisplayAudioWrapper>
          )}
        </WidgetWrapper>
      )}
    </>
  );
};

export default TrackWidget;
