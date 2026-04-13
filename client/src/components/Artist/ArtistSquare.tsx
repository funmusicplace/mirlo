import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { getArtistUrl } from "utils/artist";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import ArtistFallbackComposite from "./ArtistFallbackComposite";
import {
  TrackGroupWrapper,
  TrackGroupLinks,
  TrackGroupInfo,
} from "./ArtistTrackGroup";

const ArtistSquare: React.FC<{
  artist: Artist;
}> = ({ artist }) => {
  const standardImageSrc =
    artist.avatar?.sizes?.[300] ?? artist.banner?.sizes?.[625];

  console.log(
    "ArtistSquare render",
    artist.name,
    "standardImageSrc:",
    standardImageSrc
  );

  return (
    <TrackGroupWrapper>
      <div>
        <Link to={getArtistUrl(artist)} aria-label={artist.name}>
          {standardImageSrc ? (
            <ImageWithPlaceholder
              src={standardImageSrc}
              alt={artist.name}
              size={300}
              square
              objectFit="contain"
            />
          ) : (
            <ArtistFallbackComposite artist={artist} />
          )}
        </Link>

        <TrackGroupLinks>
          <TrackGroupInfo>
            {artist && <Link to={getArtistUrl(artist)}>{artist.name}</Link>}
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
