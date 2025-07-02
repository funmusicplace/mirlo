import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";

const TrackAuthors: React.FC<{ track: Track; trackGroupArtistId?: number }> = ({
  track,
  trackGroupArtistId,
}) => {
  const coAuthors =
    track.trackArtists?.filter((artist) => artist.isCoAuthor) ?? [];

  return (
    <>
      {coAuthors.find((author) => author.artistId !== trackGroupArtistId) && (
        <span
          className={
            css`
              color: var(--mi-lighter-foreground-color);
              margin-left: 0.5rem;
              font-size: 0.85rem;

              a {
                color: var(--mi-lighter-foreground-color);
                text-decoration: none;
              }
            ` +
            " " +
            "track-authors"
          }
        >
          {coAuthors.map((artist, index) => (
            <React.Fragment key={artist.artistName}>
              {artist.artistId ? (
                <Link to={`/${artist.artistId}`} id="player-artist-name">
                  {artist.artistName}
                </Link>
              ) : (
                artist.artistName
              )}
              {index < coAuthors.length - 1 && ", "}
            </React.Fragment>
          ))}
        </span>
      )}
    </>
  );
};

export default TrackAuthors;
