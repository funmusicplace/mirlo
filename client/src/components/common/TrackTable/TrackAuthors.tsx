import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import Tooltip from "../Tooltip";

const AuthorName: React.FC<{
  artist: NonNullable<Track["trackArtists"]>[number];
}> = ({ artist }) => {
  const content = artist.artistId ? (
    <Link to={`/${artist.artistId}`} id="player-artist-name">
      {artist.artistName}
    </Link>
  ) : (
    <span>{artist.artistName}</span>
  );

  if (artist.role) {
    return (
      <Tooltip
        position="right"
        hoverText={artist.role}
        underline={false}
        compact
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};

const TrackAuthors: React.FC<{ track: Track; trackGroupArtistId?: number }> = ({
  track,
  trackGroupArtistId,
}) => {
  const coAuthors = (
    track.trackArtists?.filter((artist) => artist.isCoAuthor) ?? []
  ).sort((a, b) => a.order - b.order);

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
              <AuthorName artist={artist} />
              {index < coAuthors.length - 1 && ", "}
            </React.Fragment>
          ))}
        </span>
      )}
    </>
  );
};

export default TrackAuthors;
