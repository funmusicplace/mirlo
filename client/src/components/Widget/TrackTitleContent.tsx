import { TrackArtistLinks } from "components/Player/PlayingTrackDetails";
import React from "react";
import { useTranslation } from "react-i18next";
import { getArtistUrl, getReleaseUrl } from "utils/artist";

import { WidgetLink } from "./utils";

export const TrackTitleContent: React.FC<{
  track: Track;
  embeddedInMirlo: boolean;
  combineFromAndBy?: boolean;
  byLineEnd?: React.ReactNode;
}> = ({ track, embeddedInMirlo, combineFromAndBy, byLineEnd }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackDetails" });
  const { t: tTrackGroup } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const trackGroupLabel = track.trackGroup.isDraft
    ? "Drafts"
    : track.trackGroup.title || tTrackGroup("untitled");

  const trackGroupLink = (
    <WidgetLink
      to={getReleaseUrl(track.trackGroup.artist, track.trackGroup)}
      embeddedInMirlo={embeddedInMirlo}
    >
      {trackGroupLabel}
    </WidgetLink>
  );

  const artistLink = track.trackGroup.artist ? (
    embeddedInMirlo ? (
      <TrackArtistLinks track={track} target="_blank" fullLink />
    ) : (
      <WidgetLink
        to={getArtistUrl(track.trackGroup.artist)}
        embeddedInMirlo={false}
      >
        {track.trackGroup.artist.name}
      </WidgetLink>
    )
  ) : null;

  const byLineWrapperClass =
    "text-sm leading-normal break-normal max-sm:text-xs max-xs:text-[0.65rem] [&_a:hover]:underline! flex items-center justify-between gap-2 max-xs:flex-col max-xs:items-start max-xs:gap-0";

  return (
    <>
      <div className="text-lg font-bold leading-tight truncate break-normal max-sm:text-base max-xs:text-sm">
        {track.title ?? ""}
      </div>
      {combineFromAndBy ? (
        <div className={byLineWrapperClass}>
          <span className="flex-1 min-w-0 truncate">
            <span className="opacity-60">{t("from")}</span> {trackGroupLink}
            {artistLink && (
              <>
                {" · "}
                <span className="opacity-60">{t("by")}</span> {artistLink}
              </>
            )}
          </span>
          {byLineEnd && (
            <div className="hidden max-sm:flex shrink-0 items-center gap-1 ">
              {byLineEnd}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm leading-normal truncate break-normal max-sm:text-xs max-xs:text-[0.65rem] [&_a:hover]:underline!">
            <span className="opacity-60">{t("from")}</span> {trackGroupLink}
          </div>
          <div className={byLineWrapperClass}>
            <span className="flex-1 min-w-0 truncate">
              <span className="opacity-60">{t("by")}</span> {artistLink}
            </span>
            {byLineEnd && (
              <div className="hidden max-sm:flex shrink-0 items-center gap-1 ">
                {byLineEnd}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default TrackTitleContent;
