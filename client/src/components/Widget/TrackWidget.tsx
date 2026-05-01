import LoadingBlocks from "components/Artist/LoadingBlocks";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import { AudioWrapper } from "components/Player/AudioWrapper";
import { TrackArtistLinks } from "components/Player/PlayingTrackDetails";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { getReleaseUrl } from "utils/artist";
import { usePlayerSyncState } from "utils/playerSync";
import { fmtMSS, isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";
import { isEmbeddedInMirlo } from "utils/widgetContext";

import { PlayButtonsWrapper } from "./PlayButtonsWrapper";
import { WidgetWrapper } from "./utils";
import WidgetActionButtons from "./WidgetActionButtons";

const TrackWidget = () => {
  const params = useParams();
  const { user } = useAuthContext();

  const [track, setTrack] = React.useState<Track>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentSeconds, setCurrentSeconds] = React.useState(0);
  const { t } = useTranslation("translation", { keyPrefix: "trackDetails" });
  const { t: tTrackGroup } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const [artist, setArtist] = React.useState<Artist>();

  const embeddedInMirlo = isEmbeddedInMirlo();
  const artistColors = artist?.properties?.colors;
  const textColor = artistColors?.text ?? "var(--mi-text-color)";

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      try {
        const results = await api.get<Track>(`tracks/${params.id}`);
        const track = results.result;
        setTrack(results.result);

        const response = await api.get<Artist>(
          `artists/${track.trackGroup.artistId}`
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

  const playerSyncState = usePlayerSyncState();
  React.useEffect(() => {
    if (!embeddedInMirlo || !track || !playerSyncState) return;
    if (playerSyncState.currentTrackId === track.id) {
      setCurrentSeconds(playerSyncState.currentSeconds);
    }
  }, [embeddedInMirlo, track, playerSyncState]);

  if (isLoading) {
    return <LoadingBlocks />;
  }

  return (
    <>
      {(!track || !track.id) && !isLoading && (
        <div className="[border:var(--mi-border)] h-[130px] flex w-full justify-center items-center p-4">
          {t("trackDoesntExist")}
        </div>
      )}
      {track?.id && (
        <WidgetWrapper
          artistColors={artistColors}
          className="flex-col border-0!"
        >
          <MetaCard
            title={`${track.title} by ${
              track.trackGroup.artist?.name ?? "Unknown"
            }`}
            description={"A track on Mirlo"}
            image={track.trackGroup.cover?.sizes?.[300]}
            player={widgetUrl(track.id, "track")}
          />
          <div className="flex items-stretch h-[130px]">
            <div className="relative shrink-0 w-[130px] h-[130px]">
              <ImageWithPlaceholder
                src={
                  track.trackGroup.cover?.sizes?.[300] ??
                  track.trackGroup.artist?.avatar?.sizes?.[300] ??
                  ""
                }
                alt={track.title ?? "Untitled track"}
                size={130}
                square
                objectFit="cover"
                className="rounded-l-[0.3rem]"
              />
              {isTrackOwnedOrPreview(track, user) && (
                <div className="hidden absolute bottom-[0.4rem] right-[0.4rem] max-sm:block">
                  <PlayButtonsWrapper ids={[track.id]} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 flex items-stretch overflow-hidden">
                <div
                  className="flex-1 min-w-0 flex flex-col justify-center pl-4 pr-2 overflow-hidden relative"
                  style={{ color: textColor }}
                >
                  <div className="text-xl font-bold truncate max-sm:text-base">
                    {track.title ?? ""}
                  </div>
                  <div className="text-sm opacity-85 truncate max-sm:text-xs">
                    {t("from")}{" "}
                    {embeddedInMirlo && (
                      <Link
                        target="_blank"
                        rel="noopener noreferrer"
                        to={getReleaseUrl(
                          track.trackGroup.artist,
                          track.trackGroup
                        )}
                      >
                        {track.trackGroup.isDraft
                          ? "Drafts"
                          : track.trackGroup.title || tTrackGroup("untitled")}
                      </Link>
                    )}
                    {!embeddedInMirlo && (
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`${import.meta.env.VITE_CLIENT_DOMAIN}${getReleaseUrl(
                          track.trackGroup.artist,
                          track.trackGroup
                        )}`}
                      >
                        {track.trackGroup.isDraft
                          ? "Drafts"
                          : track.trackGroup.title || tTrackGroup("untitled")}
                      </a>
                    )}
                  </div>
                  <div className="text-sm opacity-85 truncate max-sm:text-xs">
                    {t("by")}{" "}
                    <TrackArtistLinks track={track} target="_blank" fullLink />
                  </div>
                  <div className="hidden max-sm:block max-sm:absolute max-sm:top-2 max-sm:right-2">
                    <WidgetActionButtons
                      artist={artist}
                      trackGroup={track.trackGroup}
                      track={track}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between pt-3 pb-5 px-4 shrink-0 max-sm:hidden">
                  <WidgetActionButtons
                    artist={artist}
                    trackGroup={track.trackGroup}
                    track={track}
                  />
                  {isTrackOwnedOrPreview(track, user) && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums opacity-90">
                        {fmtMSS(
                          currentSeconds > 0
                            ? currentSeconds
                            : (track.audio?.duration ?? 0)
                        )}
                      </span>
                      <PlayButtonsWrapper ids={[track.id]} />
                    </div>
                  )}
                </div>
              </div>
              {!embeddedInMirlo && (
                <AudioWrapper
                  currentTrack={track}
                  position="static"
                  setCurrentSeconds={setCurrentSeconds}
                  currentSeconds={currentSeconds}
                  compact
                />
              )}
            </div>
          </div>
        </WidgetWrapper>
      )}
    </>
  );
};

export default TrackWidget;
