import { css } from "@emotion/css";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import React from "react";
import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";

import { bp } from "../../constants";

import ArtistFallbackComposite from "./ArtistFallbackComposite";
import {
  TrackGroupWrapper,
  TrackGroupLinks,
  TrackGroupInfo,
} from "./ArtistTrackGroup";

const ArtistSquare: React.FC<{
  artist: Artist;
  circle?: boolean;
}> = ({ artist, circle }) => {
  const standardImageSrc =
    artist.avatar?.sizes?.[300] ?? artist.background?.sizes?.[625];

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
              objectFit={circle ? "cover" : "contain"}
              className={circle ? "rounded-full overflow-hidden" : undefined}
            />
          ) : (
            <div
              className={circle ? "rounded-full overflow-hidden" : undefined}
            >
              <ArtistFallbackComposite artist={artist} />
            </div>
          )}
        </Link>

        <TrackGroupLinks>
          <TrackGroupInfo className={circle ? "text-center" : ""}>
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
