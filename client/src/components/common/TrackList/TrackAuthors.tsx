import { cx } from "@emotion/css";
import styled from "@emotion/styled";
import React from "react";
import { Link } from "react-router-dom";
import { getTrackArtistsByAppearance } from "utils/artist";
import { useMatchMedia } from "utils/useMatchMedia";

import { bp } from "../../../constants";
import ArtistNameList, { MainAndFeaturedArtists } from "../ArtistNameList";

const renderPlainName = (artist: ArtistLink) => <span>{artist.name}</span>;

export const TrackArtistNames: React.FC<{
  mainArtists: ArtistLink[];
  featuredArtists?: ArtistLink[];
  className?: string;
  disableLinks?: boolean;
}> = ({ mainArtists, featuredArtists = [], className, disableLinks }) => (
  <span className={cx("track-authors", className)}>
    <MainAndFeaturedArtists
      main={mainArtists}
      featured={featuredArtists}
      renderList={(artists) => (
        <ArtistNameList
          artists={artists}
          showRoles
          renderPlain={renderPlainName}
          renderLink={
            disableLinks
              ? renderPlainName
              : (artist, url) => <Link to={url}>{artist.name}</Link>
          }
        />
      )}
    />
  </span>
);

const TrackRowAuthorNames = styled(TrackArtistNames)`
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
  const { main, featured } = getTrackArtistsByAppearance(track);

  if (main.length === 0 && featured.length === 0) {
    return null;
  }

  return (
    <TrackRowAuthorNames
      mainArtists={main}
      featuredArtists={featured}
      disableLinks={isMobile}
    />
  );
};

export default TrackAuthors;
