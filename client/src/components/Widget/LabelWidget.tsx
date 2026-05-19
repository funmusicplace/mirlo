import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import ScrollFadeOverlay from "components/common/ScrollFadeOverlay";
import PublicTrackGroupListing from "components/common/TrackList/PublicTrackGroupListing";
import { AudioWrapper } from "components/Player/AudioWrapper";
import useCurrentTrackHook from "components/Player/useCurrentTrackHook";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { getArtistUrl } from "utils/artist";
import { isTrackOwnedOrPreview } from "utils/tracks";
import { isEmbeddedInMirlo } from "utils/widgetContext";

import { PlayButtonsWrapper } from "./PlayButtonsWrapper";
import { TgWidgetWrapper, TrackListWrapper, WidgetWrapper } from "./utils";

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

  const embeddedInMirlo = isEmbeddedInMirlo();

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
        className={`[border:var(--mi-border)] flex w-full justify-center p-4 ${
          embeddedInMirlo ? "min-h-[200px]" : ""
        }`}
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
      embeddedInMirlo={embeddedInMirlo}
      className="h-screen [&_a]:no-underline!"
    >
      <TgWidgetWrapper>
        <div className="[grid-area:cover] relative">
          <div className="absolute right-[2.5%] bottom-[2.5%]">
            <PlayButtonsWrapper ids={playableTracks.map((t) => t.id)} />
          </div>
          <ImageWithPlaceholder
            src={label?.profile?.avatar?.sizes?.[600] ?? ""}
            alt={label?.profile?.name ?? "A label"}
            size={600}
            square
            objectFit="contain"
          />
        </div>

        <div className="[grid-area:title] min-w-0 overflow-hidden border-l border-current/20 flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col p-4 max-sm:justify-center">
            <div className="text-xl font-bold truncate break-normal max-sm:text-base">
              {embeddedInMirlo && label.profile && (
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  to={getArtistUrl(label.profile)}
                >
                  {label.profile.name}
                </Link>
              )}
              {!embeddedInMirlo && label.profile && (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${import.meta.env.VITE_CLIENT_DOMAIN}${getArtistUrl(
                    label.profile
                  )}`}
                >
                  {label.profile.name}
                </a>
              )}
            </div>
          </div>
          {currentTrack && !embeddedInMirlo && (
            <AudioWrapper
              currentTrack={currentTrack}
              position="static"
              setCurrentSeconds={setCurrentSeconds}
              currentSeconds={currentSeconds}
              compact
            />
          )}
        </div>

        <div className="[grid-area:tracks] flex flex-col min-h-0 overflow-hidden border-l border-t border-current/20 max-sm:border-l-0 relative">
          <TrackListWrapper id="label-tracks-scroll">
            <PublicTrackGroupListing tracks={tracks} inWidget />
          </TrackListWrapper>
          <ScrollFadeOverlay
            scrollElementId="label-tracks-scroll"
            position="bottom"
            fadeColor={
              label?.profile?.properties?.colors?.background ??
              "var(--mi-background-color)"
            }
          />
        </div>
      </TgWidgetWrapper>
    </WidgetWrapper>
  );
};

export default LabelWidget;
