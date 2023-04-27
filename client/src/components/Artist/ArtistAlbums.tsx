import React from "react";
import { useTranslation } from "react-i18next";
import ArtistTrackGroup from "./ArtistTrackGroup";

const ArtistAlbums: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!artist) {
    return null;
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <h2>{t("releases")}</h2>
      {artist.trackGroups?.map((trackGroup) => (
        <ArtistTrackGroup
          key={trackGroup.id}
          trackGroup={trackGroup}
          artist={artist}
        />
      ))}
    </div>
  );
};

export default ArtistAlbums;
