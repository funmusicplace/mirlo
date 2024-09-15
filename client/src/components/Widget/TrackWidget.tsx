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
import { isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";
import { FlexWrapper, WidgetWrapper, inIframe, inMirlo } from "./utils";
import { PlayButtonsWrapper } from "./PlayButtonsWrapper";
import DisplayAudioWrapper from "./DisplayAudio";
import { bp } from "../../constants";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { useAuthContext } from "state/AuthContext";

const TrackWidget = () => {
  const params = useParams();
  const { user } = useAuthContext();
  const [currentSeconds, setCurrentSeconds] = React.useState(0);

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

  if (isLoading) {
    return <LoadingBlocks />;
  }

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
            `}
          >
            <ImageWithPlaceholder
              src={track.trackGroup.cover?.sizes?.[300] ?? ""}
              alt={track.title}
              size={150}
              className={css`
                width: auto !important;
                border-radius: 0.3rem 0 0 0.3rem;
              `}
            />

            <FlexWrapper
              className={css`
                width: 100%;
                min-width: 30%;
                flex-direction: row;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;

                @media screen and (max-width: ${bp.small}px) {
                  flex-direction: column;
                  align-items: flex-start;
                }
              `}
            >
              <FlexWrapper
                className={css`
                  flex: 30%;

                  @media screen and (max-width: ${bp.small}px) {
                    width: 100%;
                  }
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
              </FlexWrapper>
              {isTrackOwnedOrPreview(track, user) && (
                <div
                  className={css`
                    padding: 0 2% 0 1rem;

                    @media screen and (max-width: ${bp.small}px) {
                      padding: ${embeddedInMirlo && "0 2% 0.5rem 1rem"};
                    }
                  `}
                >
                  <PlayButtonsWrapper ids={[track.id]} />
                </div>
              )}

              <FlexWrapper
                className={css`
                  position: relative;
                  width: 100%;
                `}
              >
                {track && !embeddedInMirlo && (
                  <div
                    className={css`
                      flex: 100%;
                      width: 100%;
                      padding: 1rem 2% 0 1rem;
                      margin: auto;

                      @media screen and (max-width: ${bp.small}px) {
                        padding: 0.5rem 0 0 0;
                        margin-top: 0.1rem;
                      }
                    `}
                  >
                    <DisplayAudioWrapper>
                      <AudioWrapper
                        currentTrack={track}
                        position="relative"
                        setCurrentSeconds={setCurrentSeconds}
                        currentSeconds={currentSeconds}
                      />
                    </DisplayAudioWrapper>
                  </div>
                )}
              </FlexWrapper>
            </FlexWrapper>
          </FlexWrapper>
        </WidgetWrapper>
      )}
    </>
  );
};

export default TrackWidget;
