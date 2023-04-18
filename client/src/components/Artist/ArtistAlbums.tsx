import React from "react";
import ArtistTrackGroup from "./ArtistTrackGroup";

const ArtistAlbums: React.FC<{ artist: Artist }> = ({ artist }) => {
  if (!artist) {
    return null;
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <h2>Releases</h2>
      {artist.trackGroups?.map((trackGroup) => (
        <ArtistTrackGroup trackGroup={trackGroup} artist={artist} />
      ))}
    </div>
  );
};

export default ArtistAlbums;
