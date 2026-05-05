import React from "react";
import { useTranslation } from "react-i18next";
import {
  getArtistUrl,
  getArtistUrlReference,
  getReleaseUrl,
} from "utils/artist";

import { ElapsedTime, WidgetLink } from "./utils";

export const TrackGroupTitleContent: React.FC<{
  trackGroup: TrackGroup;
  currentTrack: Track | undefined;
  embeddedInMirlo: boolean;
  elapsedSeconds?: number;
  playingLineEnd?: React.ReactNode;
}> = ({
  trackGroup,
  currentTrack,
  embeddedInMirlo,
  elapsedSeconds,
  playingLineEnd,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  if (!trackGroup.artist) return null;

  const artistRef = embeddedInMirlo
    ? getArtistUrl(trackGroup.artist)
    : `/${getArtistUrlReference(trackGroup.artist)}`;

  return (
    <>
      <div className="text-lg font-bold leading-tight truncate break-normal max-sm:text-base max-xs:text-sm">
        <WidgetLink
          to={getReleaseUrl(trackGroup.artist, trackGroup)}
          embeddedInMirlo={embeddedInMirlo}
        >
          {trackGroup.title || t("untitled")}
        </WidgetLink>
      </div>
      <div className="text-sm opacity-85 leading-normal truncate break-normal max-sm:text-xs max-xs:text-[0.65rem] [&_a:hover]:underline!">
        {t("by")}{" "}
        <WidgetLink to={artistRef} embeddedInMirlo={embeddedInMirlo}>
          {trackGroup.artist.name}
        </WidgetLink>
        {" · "}
        {t("trackCount", { count: trackGroup.tracks.length })}
      </div>
      {(currentTrack || playingLineEnd) && (
        <div className="text-sm opacity-85 leading-normal break-normal max-sm:text-xs max-xs:text-[0.65rem] flex items-center justify-between gap-2 max-xs:flex-col max-xs:items-start max-xs:gap-0">
          <span className="flex-1 min-w-0 truncate">
            {currentTrack && (
              <>
                <em>{t("playing")}</em> {currentTrack.title}
                {elapsedSeconds !== undefined && (
                  <>
                    {" · "}
                    <ElapsedTime current={elapsedSeconds} />
                  </>
                )}
              </>
            )}
          </span>
          {playingLineEnd && (
            <div className="shrink-0 flex items-center gap-1">
              {playingLineEnd}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TrackGroupTitleContent;
