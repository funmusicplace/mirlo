import { css } from "@emotion/css";
import { AudioWrapper } from "components/AudioWrapper";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";
import { FlexWrapper, WidgetWrapper, inIframe, inMirlo } from "./utils";
import PublicTrackGroupListing from "components/common/PublicTrackGroupListing";
import { PlayButtonsWrapper } from "./PlayButtonsWrapper";
import DisplayAudioWrapper from "./DisplayAudio";
import useCurrentTrackHook from "components/Player/useCurrentTrackHook";
import { getArtistUrlReference, getReleaseUrl } from "utils/artist";

const TrackGroupWidget = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const params = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();

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
          ${embeddedInMirlo && "min-height: 154px;"}
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
    <WidgetWrapper>
      <MetaCard
        title={`${trackGroup.title} by ${trackGroup.artist?.name ?? "Unknown"}`}
        description={`An album on Mirlo`}
        image={trackGroup.cover?.sizes?.[300]}
        player={widgetUrl(trackGroup.id, "trackGroup")}
      />
      <FlexWrapper
        className={css`
          align-items: flex-start;
        `}
      >
        <ImageWithPlaceholder
          src={trackGroup.cover?.sizes?.[300] ?? ""}
          alt={trackGroup.title}
          size={135}
        />
        <div
          className={css`
            width: 100%;
          `}
        >
          <div
            className={css`
              padding: 0.5rem 2rem;
            `}
          >
            {embeddedInMirlo && trackGroup.artist && (
              <Link to={getReleaseUrl(trackGroup.artist, trackGroup)}>
                {trackGroup.title}
              </Link>
            )}
            {!embeddedInMirlo && trackGroup.artist && (
              <a
                href={`${process.env.REACT_APP_CLIENT_DOMAIN}${getReleaseUrl(
                  trackGroup.artist,
                  trackGroup
                )}`}
              >
                {trackGroup.title}
              </a>
            )}{" "}
            by{" "}
            {embeddedInMirlo && trackGroup.artist && (
              <Link to={getArtistUrlReference(trackGroup.artist)}>
                {trackGroup.artist.name}
              </Link>
            )}
            {!embeddedInMirlo && trackGroup.artist && (
              <a
                href={`${
                  process.env.REACT_APP_CLIENT_DOMAIN
                }/${getArtistUrlReference(trackGroup.artist)}`}
              >
                {trackGroup.artist.name}
              </a>
            )}
          </div>
          <PublicTrackGroupListing
            tracks={trackGroup.tracks}
            trackGroup={trackGroup}
          />
        </div>
        <div
          className={css`
            align-self: center;
            padding: 0 2rem;
          `}
        >
          <PlayButtonsWrapper ids={playableTracks.map((t) => t.id)} />
        </div>
      </FlexWrapper>
      {currentTrack && !embeddedInMirlo && (
        <DisplayAudioWrapper>
          <AudioWrapper
            currentTrack={currentTrack}
            hideControls
            position="relative"
          />
        </DisplayAudioWrapper>
      )}
    </WidgetWrapper>
  );
};

export default TrackGroupWidget;
