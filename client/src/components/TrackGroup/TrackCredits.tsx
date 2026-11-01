import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { fmtMSS } from "utils/tracks";

import ReleaseDate from "./ReleaseDate";

const TrackCredits: React.FC<{ track: Track; trackGroup: TrackGroup }> = ({
  track,
  trackGroup,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const trackArtists = (
    track.trackArtists?.filter((artist) => artist.artistName?.trim()) ?? []
  ).sort((a, b) => a.order - b.order);
  const showLicense = track.license && track.license.short !== "copyright";
  const metaParts = [
    track.audio?.duration && (
      <span key="duration">{fmtMSS(track.audio.duration)}</span>
    ),
    <span key="position">
      {t("trackPosition", {
        position: track.order,
        count: trackGroup.tracks.length,
      })}
    </span>,
    trackGroup.releaseDate && (
      <ReleaseDate key="date" releaseDate={trackGroup.releaseDate} inline />
    ),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5 text-sm text-(--mi-light-foreground-color)">
      <div className="flex flex-wrap gap-x-1.5">
        {metaParts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span aria-hidden>·</span>}
            {part}
          </React.Fragment>
        ))}
      </div>
      {trackArtists.map((artist) => (
        <p key={`${artist.artistName}-${artist.order}`} className="m-0">
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
        </p>
      ))}
      {showLicense && track.license && (
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
    </div>
  );
};

export default TrackCredits;
