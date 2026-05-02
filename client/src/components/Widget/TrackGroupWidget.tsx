import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import ScrollFadeOverlay from "components/common/ScrollFadeOverlay";
import PublicTrackGroupListing from "components/common/TrackTable/PublicTrackGroupListing";
import { AudioWrapper } from "components/Player/AudioWrapper";
import useCurrentTrackHook from "components/Player/useCurrentTrackHook";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import {
  getArtistUrl,
  getArtistUrlReference,
  getReleaseUrl,
} from "utils/artist";
import { usePlayerSyncState } from "utils/playerSync";
import { fmtMSS, isTrackOwnedOrPreview } from "utils/tracks";
import { isEmbeddedInMirlo } from "utils/widgetContext";

import { PlayButtonsWrapper } from "./PlayButtonsWrapper";
import { TgWidgetWrapper, TrackListWrapper, WidgetWrapper } from "./utils";
import WidgetActionButtons from "./WidgetActionButtons";

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

  const embeddedInMirlo = isEmbeddedInMirlo();
  const playerSyncState = usePlayerSyncState();
  const elapsedSeconds = embeddedInMirlo
    ? (playerSyncState?.currentSeconds ?? 0)
    : currentSeconds;

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
        className={`[border:var(--mi-border)] flex w-full justify-center p-4 ${
          embeddedInMirlo ? "min-h-[200px]" : ""
        }`}
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
      className="h-screen border-0! [&_a]:no-underline!"
    >
      <TgWidgetWrapper>
        <div className="[grid-area:cover] relative">
          <div className="absolute right-[2.5%] bottom-[2.5%]">
            <PlayButtonsWrapper ids={playableTracks.map((t) => t.id)} />
          </div>
          <ImageWithPlaceholder
            src={trackGroup.cover?.sizes?.[600] ?? ""}
            alt={trackGroup.title ?? "Untitled release"}
            size={600}
            square
            objectFit="contain"
          />
        </div>

        <div className="[grid-area:title] min-w-0 overflow-hidden border-l border-current/15 flex flex-col">
          <div className="flex-1 min-h-0 flex p-4 gap-3 max-sm:items-center relative">
            <div className="flex-1 min-w-0 flex flex-col sm:pr-[8rem]">
              <div className="text-xl font-bold truncate break-normal max-sm:text-base">
                {embeddedInMirlo && trackGroup.artist && (
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    to={getReleaseUrl(trackGroup.artist, trackGroup)}
                  >
                    {trackGroup.title}
                  </Link>
                )}
                {!embeddedInMirlo && trackGroup.artist && (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`${import.meta.env.VITE_CLIENT_DOMAIN}${getReleaseUrl(
                      trackGroup.artist,
                      trackGroup
                    )}`}
                  >
                    {trackGroup.title}
                  </a>
                )}
              </div>
              <div className="text-sm opacity-85 truncate break-normal max-sm:text-xs [&_a:hover]:underline!">
                {t("by")}{" "}
                {embeddedInMirlo && trackGroup.artist && (
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    to={getArtistUrl(trackGroup.artist)}
                  >
                    {trackGroup.artist.name}
                  </Link>
                )}
                {!embeddedInMirlo && trackGroup.artist && (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`${
                      import.meta.env.VITE_CLIENT_DOMAIN
                    }/${getArtistUrlReference(trackGroup.artist)}`}
                  >
                    {trackGroup.artist.name}
                  </a>
                )}
                {" · "}
                {t("trackCount", { count: trackGroup.tracks.length })}
              </div>
              {currentTrack && (
                <div className="text-sm opacity-85 truncate break-normal max-sm:text-xs">
                  <em>{t("playing")}</em> {currentTrack.title} ·{" "}
                  <span className="tabular-nums">{fmtMSS(elapsedSeconds)}</span>
                </div>
              )}
            </div>
            {trackGroup.artist && (
              <div className="shrink-0 absolute top-4 right-4 max-sm:top-2 max-sm:right-2">
                <WidgetActionButtons artist={artist} trackGroup={trackGroup} />
              </div>
            )}
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

        <div className="[grid-area:tracks] flex flex-col min-h-0 overflow-hidden border-l border-t border-current/15 max-sm:border-l-0 relative">
          <TrackListWrapper id="trackgroup-tracks-scroll">
            <PublicTrackGroupListing
              size="small"
              showDropdown={false}
              tracks={trackGroup.tracks}
              trackGroup={trackGroup}
              inWidget
            />
          </TrackListWrapper>
          <ScrollFadeOverlay
            scrollElementId="trackgroup-tracks-scroll"
            position="bottom"
            fadeColor={
              artist?.properties?.colors?.background ??
              "var(--mi-background-color)"
            }
          />
        </div>
      </TgWidgetWrapper>
    </WidgetWrapper>
  );
};

export default TrackGroupWidget;
