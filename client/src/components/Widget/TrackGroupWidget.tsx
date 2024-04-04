import { css } from "@emotion/css";
import { AudioWrapper } from "components/AudioWrapper";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";
import {
  FlexWrapper,
  TgWidgetWrapper,
  TrackListWrapper,
  WidgetTitleWrapper,
  WidgetWrapper,
  inIframe,
  inMirlo,
} from "./utils";
import PublicTrackGroupListing from "components/common/PublicTrackGroupListing";
import { PlayButtonsWrapper } from "./PlayButtonsWrapper";
import DisplayAudioWrapper from "./DisplayAudio";
import useCurrentTrackHook from "components/Player/useCurrentTrackHook";
import {
  getArtistUrl,
  getArtistUrlReference,
  getReleaseUrl,
} from "utils/artist";
import { bp } from "../../constants";
import { useAuthContext } from "state/AuthContext";

const TrackGroupWidget = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const params = useParams();
  const { user } = useAuthContext();

  const { currentTrack } = useCurrentTrackHook();

  const [trackGroup, setTrackGroup] = React.useState<TrackGroup>();
  const [isLoading, setIsLoading] = React.useState(true);

  const embeddedInMirlo = inIframe() && inMirlo();

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      try {
        const results = await api.get<TrackGroup>(`trackGroups/${params.id}`);
        setTrackGroup(results.result);
      } catch (e) {
        console.error("e", e);
      } finally {
        setIsLoading(false);
      }
    };

    callback();
  }, [params.id]);

  if ((!trackGroup || !trackGroup.id) && !isLoading) {
    return (
      <div
        className={css`
          border: var(--mi-border);
          ${embeddedInMirlo && "min-height: 364px;"}
          display: flex;
          width: 100%;
          justify-content: center;
          padding: 1rem;
        `}
      >
        {t("trackDoesntExist")}
      </div>
    );
  }

  if (!trackGroup) {
    return null;
  }

  const playableTracks = trackGroup.tracks.filter((track) => {
    return isTrackOwnedOrPreview(track, user, trackGroup);
  });

  return (
    <WidgetWrapper
      className={css`
        ${embeddedInMirlo && "min-height: 360px;"}
        ${!embeddedInMirlo && "min-height: 366px;"}
        overflow: hidden;
        background-color: white !important;
        @media (prefers-color-scheme: dark) {
          background-color: black !important;
        }
      `}
    >
      <TgWidgetWrapper>
        <MetaCard
          title={`${trackGroup.title} by ${
            trackGroup.artist?.name ?? "Unknown"
          }`}
          description={`An album on Mirlo`}
          image={trackGroup.cover?.sizes?.[600]}
          player={widgetUrl(trackGroup.id, "trackGroup")}
        />
        <FlexWrapper
          className={css`
            flex: 55%;
            max-width: 360px;
            position: relative;

            @media screen and (max-width: ${bp.small}px) {
              max-width: 227px;
              width: 100%;
              flex: 100%;
              margin-bottom: 0.5rem;
            }
          `}
        >
          <div
            className={css`
              position: absolute;
              right: 2.5%;
              bottom: 2.5%;
            `}
          >
            <PlayButtonsWrapper ids={playableTracks.map((t) => t.id)} />
          </div>
          <ImageWithPlaceholder
            src={trackGroup.cover?.sizes?.[600] ?? ""}
            alt={trackGroup.title}
            size={400}
          />
        </FlexWrapper>

        <WidgetTitleWrapper>
          <div
            className={css`
              padding: 0.5rem 0.5rem 0.5rem 1rem;
              max-height: 360px;
              @media screen and (max-width: ${bp.small}px) {
                width: 227px;
                padding: 0 0 0.5rem 0;
                max-width: 100%;
                flex: 100%;
                align-self: center;
              }
            `}
          >
            <FlexWrapper
              className={css`
                align-items: center;
                padding-bottom: 1rem;

                a {
                  font-size: 1.5rem;
                }
                @media screen and (max-width: ${bp.small}px) {
                  padding-bottom: 0.25rem;
                }
              `}
            >
              {embeddedInMirlo && trackGroup.artist && (
                <Link to={getReleaseUrl(trackGroup.artist, trackGroup)}>
                  {trackGroup.title}
                </Link>
              )}
              {!embeddedInMirlo && trackGroup.artist && (
                <a
                  target={`"_blank"`}
                  href={`${process.env.REACT_APP_CLIENT_DOMAIN}${getReleaseUrl(
                    trackGroup.artist,
                    trackGroup
                  )}`}
                >
                  {trackGroup.title}
                </a>
              )}
            </FlexWrapper>{" "}
            <FlexWrapper
              className={css`
                align-items: flex-end;
                a {
                  padding-left: 0.25rem;
                }
              `}
            >
              by{" "}
              {embeddedInMirlo && trackGroup.artist && (
                <Link to={getArtistUrl(trackGroup.artist)}>
                  {trackGroup.artist.name}
                </Link>
              )}
              {!embeddedInMirlo && trackGroup.artist && (
                <a
                  target={`"_blank"`}
                  href={`${
                    process.env.REACT_APP_CLIENT_DOMAIN
                  }/${getArtistUrlReference(trackGroup.artist)}`}
                >
                  {trackGroup.artist.name}
                </a>
              )}
            </FlexWrapper>
          </div>
          <TrackListWrapper>
            <PublicTrackGroupListing
              tracks={trackGroup.tracks}
              trackGroup={trackGroup}
            />
          </TrackListWrapper>
        </WidgetTitleWrapper>
      </TgWidgetWrapper>
      {currentTrack && !embeddedInMirlo && (
        <div>
          <DisplayAudioWrapper>
            <AudioWrapper
              currentTrack={currentTrack}
              hideControls
              position="relative"
            />
          </DisplayAudioWrapper>
        </div>
      )}
    </WidgetWrapper>
  );
};

export default TrackGroupWidget;
