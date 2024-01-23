import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { getArtistUrlReference } from "utils/artist";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import {
  TrackGroupWrapper,
  TrackGroupLinks,
  TrackGroupInfo,
} from "./ArtistTrackGroup";

const ArtistSquare: React.FC<{
  artist: Artist;
}> = ({ artist }) => {
  console.log("artist", artist.trackGroups);
  return (
    <TrackGroupWrapper>
      <div>
        <ImageWithPlaceholder
          src={
            artist.avatar?.sizes?.[300] ??
            artist.banner?.sizes?.[625] ??
            artist.trackGroups?.[0]?.cover?.sizes?.[300]
          }
          alt={artist.name}
          size={300}
        />

        <TrackGroupLinks>
          <TrackGroupInfo>
            {artist && (
              <Link to={`/${getArtistUrlReference(artist)}`}>
                {artist.name}
              </Link>
            )}
          </TrackGroupInfo>
          <div
            className={css`
              button {
                margin-top: -0.25rem;
              }
              @media screen and (max-width: ${bp.small}px) {
                button {
                  margin-top: -0.1rem;
                  opacity: 0.5;
                }
              }

              @media screen and (min-width: ${bp.small}px) {
                display: none!;
              }
            `}
          ></div>
        </TrackGroupLinks>
      </div>
    </TrackGroupWrapper>
  );
};

export default ArtistSquare;
