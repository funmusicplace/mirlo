import { css } from "@emotion/css";
import { AudioWrapper } from "components/Player/AudioWrapper";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { isTrackOwnedOrPreview } from "utils/tracks";
import {
  FlexWrapper,
  TgWidgetWrapper,
  TrackListWrapper,
  WidgetTitleWrapper,
  WidgetWrapper,
  inIframe,
  inMirlo,
} from "./utils";
import PublicTrackGroupListing from "components/common/TrackTable/PublicTrackGroupListing";
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
  const [currentSeconds, setCurrentSeconds] = React.useState(0);
  const [trackGroup, setTrackGroup] = React.useState<TrackGroup>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [artist, setArtist] = React.useState<Artist>();

  const embeddedInMirlo = inIframe() && inMirlo();

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      try {
        const results = await api.get<TrackGroup>(`trackGroups/${params.id}`);
        setTrackGroup(results.result);
        const response = await api.get<Artist>(
          `artists/${results.result.artistId}`
        );
        setArtist(response.result);
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
          ${embeddedInMirlo && "min-height: 359px;"}
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
      artistColors={artist?.properties?.colors}
      className={css`
        height: 100vh;
        overflow: scroll;
        a {
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      `}
    >
      <TgWidgetWrapper className={css``}>
        <FlexWrapper
          className={css`
            position: relative;
            width: 100%;
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
            alt={trackGroup.title ?? "Untitled release"}
            size={600}
            square
            objectFit="contain"
          />
        </FlexWrapper>

        <WidgetTitleWrapper className={css``}>
          <div
            className={css`
              padding: 1rem;
            `}
          >
            <FlexWrapper
              className={css`
                a {
                  font-size: 1.5rem;
                }
                @media screen and (max-width: ${bp.small}px) {
                  padding-bottom: 0.25rem;
                }
              `}
            >
              {embeddedInMirlo && trackGroup.artist && (
                <Link
                  target={`"_blank"`}
                  to={getReleaseUrl(trackGroup.artist, trackGroup)}
                >
                  {trackGroup.title}
                </Link>
              )}
              {!embeddedInMirlo && trackGroup.artist && (
                <a
                  target={`"_blank"`}
                  href={`${import.meta.env.VITE_CLIENT_DOMAIN}${getReleaseUrl(
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
                <Link target={`"_blank"`} to={getArtistUrl(trackGroup.artist)}>
                  {trackGroup.artist.name}
                </Link>
              )}
              {!embeddedInMirlo && trackGroup.artist && (
                <a
                  target={`"_blank"`}
                  href={`${
                    import.meta.env.VITE_CLIENT_DOMAIN
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
              position="relative"
              setCurrentSeconds={setCurrentSeconds}
              currentSeconds={currentSeconds}
            />
          </DisplayAudioWrapper>
        </div>
      )}
    </WidgetWrapper>
  );
};

export default TrackGroupWidget;
