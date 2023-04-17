import { css } from "@emotion/css";
import React from "react";
import ClickToPlay from "../common/ClickToPlay";
import SmallTileDetails from "../common/LargeTileDetail";

const ArtistAlbums: React.FC<{ artist: Artist }> = ({ artist }) => {
  if (!artist) {
    return null;
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <h2>Albums</h2>
      {artist.trackGroups?.map((trackGroup) => (
        <div
          key={trackGroup.id}
          className={css`
            margin-bottom: 1rem;
            border-top: 1px solid #efefef;
            margin-top: 1rem;
            padding-top: 1.5rem;
          `}
        >
          <div
            className={css`
              display: flex;

              & > :first-child {
                margin-right: 0.5rem;
              }
            `}
          >
            <ClickToPlay
              image={{
                width: 120,
                height: 120,
                url: trackGroup.cover?.sizes?.[120] ?? "",
              }}
              trackGroupId={trackGroup.id}
              title={trackGroup.title}
            />
            <SmallTileDetails
              title={trackGroup.title}
              subtitle={`Released: ${trackGroup.releaseDate.split("T")[0]}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArtistAlbums;
