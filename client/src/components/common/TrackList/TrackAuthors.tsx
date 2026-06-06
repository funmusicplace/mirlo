import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import { useMatchMedia } from "utils/useMatchMedia";

import { bp } from "../../../constants";
import Tooltip from "../Tooltip";

const AuthorName: React.FC<{
  artist: NonNullable<Track["trackArtists"]>[number];
  disableLink?: boolean;
}> = ({ artist, disableLink }) => {
  const content =
    artist.artistId && !disableLink ? (
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

const TrackAuthors: React.FC<{ track: Track }> = ({ track }) => {
  const isMobile = useMatchMedia(`screen and (max-width: ${bp.small}px)`);
  const coAuthors = (
    track.trackArtists?.filter(
      (artist) => artist.isCoAuthor && artist.artistName?.trim()
    ) ?? []
  ).sort((a, b) => a.order - b.order);

  if (coAuthors.length === 0) {
    return null;
  }

  return (
    <span
      className={
        css`
          color: var(--mi-text-color);
          opacity: 0.5;
          margin-left: 0.5rem;
          font-size: 0.85rem;

          && a {
            color: var(--mi-text-color);
            text-decoration: none;
          }

          && a:hover {
            text-decoration: underline;
          }
        ` +
        " " +
        "track-authors"
      }
    >
      {coAuthors.map((artist, index) => (
        <React.Fragment key={artist.artistName}>
          <AuthorName artist={artist} disableLink={isMobile} />
          {index < coAuthors.length - 1 && ", "}
        </React.Fragment>
      ))}
    </span>
  );
};

export default TrackAuthors;
