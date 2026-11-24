import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  getReleaseArtistLinks,
  isReleaseArtist,
  normalizeArtistName,
} from "utils/artist";
import { fmtMSS } from "utils/tracks";

import ReleaseCreditLines from "./ReleaseCreditLines";
import ReleaseDate from "./ReleaseDate";
import TrackGroupPills from "./TrackGroupPills";

type CreditedArtist = NonNullable<Track["trackArtists"]>[number];

const getCreditedArtists = (
  track: Track,
  trackGroup: TrackGroup
): NonNullable<Track["trackArtists"]> => {
  const trackArtists = (
    track.trackArtists?.filter(
      (artist): artist is CreditedArtist & { artistName: string } =>
        !!artist.artistName?.trim()
    ) ?? []
  ).sort((a, b) => a.order - b.order);
  const mainArtists = trackArtists.filter(
    (artist) => artist.appearsAs === "MAIN"
  );
  if (mainArtists.length > 0) {
    return [
      ...mainArtists,
      ...trackArtists.filter((artist) => artist.appearsAs !== "MAIN"),
    ];
  }
  const missingReleaseArtists = getReleaseArtistLinks(trackGroup).filter(
    (releaseArtist) =>
      !trackArtists.some((artist) =>
        releaseArtist.artistId
          ? isReleaseArtist(artist, {
              id: releaseArtist.artistId,
              name: releaseArtist.name,
            })
          : normalizeArtistName(artist.artistName) ===
            normalizeArtistName(releaseArtist.name)
      )
  );

  return [
    ...missingReleaseArtists.map((releaseArtist, index) => ({
      artistName: releaseArtist.name,
      artistId: releaseArtist.artistId,
      appearsAs: "MAIN" as const,
      order: index - missingReleaseArtists.length,
    })),
    ...trackArtists,
  ];
};

const isLicenseShown = (
  track: Track
): track is Track & { license: NonNullable<Track["license"]> } =>
  !!track.license && track.license.short !== "copyright";

const TrackCredits: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  showReleaseCredits?: boolean;
  alignLeft?: boolean;
}> = ({ track, trackGroup, showReleaseCredits, alignLeft }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const trackArtists = getCreditedArtists(track, trackGroup);
  const metaParts = [
    track.audio?.duration && (
      <span key="duration">{fmtMSS(track.audio.duration)}</span>
    ),
    trackGroup.tracks.length > 1 && (
      <span key="position">
        {t("trackPosition", {
          position: track.order,
          count: trackGroup.tracks.length,
        })}
      </span>
    ),
    trackGroup.releaseDate && (
      <ReleaseDate key="date" releaseDate={trackGroup.releaseDate} inline />
    ),
  ].filter(Boolean);

  return (
    <div
      className={`flex flex-col gap-1.5 text-sm text-(--mi-light-foreground-color) ${alignLeft ? "items-start" : "items-center"}`}
    >
      {metaParts.length > 0 && (
        <div
          className={`flex flex-wrap gap-x-1.5 ${alignLeft ? "justify-start" : "justify-center"}`}
        >
          {metaParts.map((part, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span aria-hidden>·</span>}
              {part}
            </React.Fragment>
          ))}
        </div>
      )}
      {trackArtists.length > 0 && (
        <p className="m-0 text-balance">
          {trackArtists.map((artist, index) => (
            <React.Fragment key={`${artist.artistName}-${artist.order}`}>
              {index > 0 && ", "}
              {artist.artistId ? (
                <Link
                  to={`/${artist.artistId}`}
                  className="text-(--mi-light-foreground-color)! underline"
                >
                  {artist.artistName}
                </Link>
              ) : (
                artist.artistName
              )}
              {artist.role && ` (${artist.role})`}
            </React.Fragment>
          ))}
        </p>
      )}
      {isLicenseShown(track) && (
        <p className="m-0">
          <Trans
            t={t}
            i18nKey="trackLicense"
            values={{ license: track.license.name }}
            components={{
              licenseLink: track.license.link ? (
                <a
                  href={track.license.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--mi-light-foreground-color)! underline"
                />
              ) : (
                <span />
              ),
            }}
          />
        </p>
      )}
      {track.isrc && <p className="m-0">{t("isrc", { isrc: track.isrc })}</p>}
      {showReleaseCredits && (
        <>
          <ReleaseCreditLines trackGroup={trackGroup} />
          <TrackGroupPills tags={trackGroup.tags} centered={!alignLeft} />
        </>
      )}
    </div>
  );
};

export default TrackCredits;
