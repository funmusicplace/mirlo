import { cx } from "@emotion/css";
import styled from "@emotion/styled";
import React from "react";
import { Link } from "react-router-dom";
import { isReleaseArtist } from "utils/artist";
import { useMatchMedia } from "utils/useMatchMedia";

import { bp } from "../../../constants";
import Tooltip from "../Tooltip";

const AuthorName: React.FC<{
  artist: NonNullable<Track["trackArtists"]>[number];
  disableLink?: boolean;
}> = ({ artist, disableLink }) => {
  const content =
    artist.artistId && !disableLink ? (
      <Link to={`/${artist.artistId}`}>{artist.artistName}</Link>
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

type CoAuthor = NonNullable<Track["trackArtists"]>[number];

export const getCoAuthors = (track: Track, excludeArtist?: Artist) =>
  (
    track.trackArtists?.filter(
      (artist) =>
        artist.isCoAuthor &&
        artist.artistName?.trim() &&
        !isReleaseArtist(artist, excludeArtist)
    ) ?? []
  ).sort((a, b) => a.order - b.order);

export const CoAuthorNames: React.FC<{
  coAuthors: CoAuthor[];
  className?: string;
  disableLinks?: boolean;
}> = ({ coAuthors, className, disableLinks }) => (
  <span className={cx("track-authors", className)}>
    {coAuthors.map((artist, index) => (
      <React.Fragment key={artist.artistName}>
        <AuthorName artist={artist} disableLink={disableLinks} />
        {index < coAuthors.length - 1 && ", "}
      </React.Fragment>
    ))}
  </span>
);

const TrackRowAuthorNames = styled(CoAuthorNames)`
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
`;

const TrackAuthors: React.FC<{ track: Track }> = ({ track }) => {
  const isMobile = useMatchMedia(`screen and (max-width: ${bp.small}px)`);
  const coAuthors = getCoAuthors(track);

  if (coAuthors.length === 0) {
    return null;
  }

  return <TrackRowAuthorNames coAuthors={coAuthors} disableLinks={isMobile} />;
};

export default TrackAuthors;
