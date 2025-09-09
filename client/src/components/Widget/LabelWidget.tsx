import { css } from "@emotion/css";
import { AudioWrapper } from "components/AudioWrapper";
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
import { getArtistUrl } from "utils/artist";
import { bp } from "../../constants";
import { useAuthContext } from "state/AuthContext";

const LabelWidget = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "labelWidget",
  });
  const params = useParams();
  const { user } = useAuthContext();

  const { currentTrack } = useCurrentTrackHook();
  const [currentSeconds, setCurrentSeconds] = React.useState(0);
  const [label, setLabel] = React.useState<Label>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [tracks, setTracks] = React.useState<Track[]>();

  const embeddedInMirlo = inIframe() && inMirlo();

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      try {
        const results = await api.get<Label>(`labels/${params.id}`);
        setLabel(results.result);
        const trackResults = await api.getMany<Track>(
          `labels/${params.id}/tracks`
        );
        setTracks(trackResults.results);
      } catch (e) {
        console.error("e", e);
      } finally {
        setIsLoading(false);
      }
    };

    callback();
  }, [params.id]);

  if ((!label || !label.id) && !isLoading) {
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

  if (!label || !tracks) {
    return null;
  }

  const playableTracks = tracks.filter((track) => {
    return isTrackOwnedOrPreview(track, user);
  });

  return (
    <WidgetWrapper
      artistColors={label?.profile?.properties?.colors}
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
            src={label?.profile?.avatar?.sizes?.[600] ?? ""}
            alt={label?.profile?.name ?? "A label"}
            size={600}
            square
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
              {embeddedInMirlo && label.profile && (
                <Link target={`"_blank"`} to={getArtistUrl(label.profile)}>
                  {label.profile.name}
                </Link>
              )}
              {!embeddedInMirlo && label.profile && (
                <a
                  target={`"_blank"`}
                  href={`${import.meta.env.VITE_CLIENT_DOMAIN}${getArtistUrl(
                    label.profile
                  )}`}
                >
                  {label.profile.name}
                </a>
              )}
            </FlexWrapper>{" "}
          </div>
          <TrackListWrapper>
            <PublicTrackGroupListing tracks={tracks} />
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

export default LabelWidget;
