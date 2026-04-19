import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TrackArtistsCredits: React.FC<{ trackGroup: TrackGroup }> = ({
  trackGroup,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const tracksWithArtists = (trackGroup.tracks ?? [])
    .map((track) => ({
      track,
      artists: (track.trackArtists ?? [])
        .filter((a) => a.artistName)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((entry) => entry.artists.length > 0);

  if (tracksWithArtists.length === 0) {
    return null;
  }

  return (
    <section
      className={css`
        margin-top: 1.5rem;
        font-size: 0.9rem;

        h3 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        li {
          margin-bottom: 0.25rem;
        }

        .track-title {
          font-weight: 600;
        }

        .role {
          color: var(--mi-lighter-foreground-color);
        }
      `}
    >
      <h3>{t("artistsAndRolesHeading")}</h3>
      <ul>
        {tracksWithArtists.map(({ track, artists }) => (
          <li key={track.id}>
            <span className="track-title">{track.title}</span>
            {": "}
            {artists.map((artist, index) => (
              <React.Fragment key={`${artist.artistName}-${artist.order}`}>
                {artist.artistId ? (
                  <Link to={`/${artist.artistId}`}>{artist.artistName}</Link>
                ) : (
                  artist.artistName
                )}
                <span className="role">
                  {" "}
                  ({artist.role || t("artistsAndRolesNoRole")})
                </span>
                {index < artists.length - 1 && ", "}
              </React.Fragment>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TrackArtistsCredits;
