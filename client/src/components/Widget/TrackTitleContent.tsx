import { TrackArtistLinks } from "components/Player/PlayingTrackDetails";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistUrl, getReleaseUrl } from "utils/artist";

import { WidgetLink } from "./utils";

export const TrackTitleContent: React.FC<{
  track: Track;
  embeddedInMirlo: boolean;
  combineFromAndBy?: boolean;
  byLineEnd?: React.ReactNode;
  titleLinkTo?: string;
  useTrackArtistLinks?: boolean;
  foldByLineAtSm?: boolean;
  compactTitle?: boolean;
}> = ({
  track,
  embeddedInMirlo,
  combineFromAndBy,
  byLineEnd,
  titleLinkTo,
  useTrackArtistLinks,
  foldByLineAtSm,
  compactTitle,
}) => {
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
    ) : useTrackArtistLinks ? (
      <TrackArtistLinks track={track} />
    ) : (
      <WidgetLink
        to={getArtistUrl(track.trackGroup.artist)}
        embeddedInMirlo={false}
      >
        {track.trackGroup.artist.name}
      </WidgetLink>
    )
  ) : null;

  const titleNode = titleLinkTo ? (
    <Link to={titleLinkTo}>{track.title ?? ""}</Link>
  ) : (
    (track.title ?? "")
  );

  const byLineWrapperBase =
    "text-sm leading-normal break-normal max-sm:text-xs max-xs:text-[0.65rem] [&_a:hover]:underline! flex items-center justify-between gap-2";
  const byLineFoldClasses = foldByLineAtSm
    ? "max-sm:flex-col max-sm:items-start max-sm:gap-0"
    : "max-xs:flex-col max-xs:items-start max-xs:gap-0";
  const byLineWrapperClass = `${byLineWrapperBase} ${byLineFoldClasses}`;

  const byLineTruncateClass = `flex-1 min-w-0 truncate ${foldByLineAtSm ? "max-sm:w-full" : "max-xs:w-full"}`;

  return (
    <>
      <div
        className={`font-bold leading-tight truncate break-normal ${
          compactTitle
            ? "text-base max-sm:text-sm max-xs:text-xs"
            : "text-lg max-sm:text-base max-xs:text-sm"
        }`}
      >
        {titleNode}
      </div>
      {combineFromAndBy ? (
        <div className={byLineWrapperClass}>
          <span className={byLineTruncateClass}>
            <span className="opacity-60">{t("from")}</span> {trackGroupLink}
            {artistLink && (
              <>
                {" · "}
                <span className="opacity-60">{t("by")}</span> {artistLink}
              </>
            )}
          </span>
          {byLineEnd && (
            <div className="hidden max-sm:flex shrink-0 items-center gap-1">
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
            <span className={byLineTruncateClass}>
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
