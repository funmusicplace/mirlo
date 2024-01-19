import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { getArtistUrlReference } from "utils/artist";
import styled from "@emotion/styled";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

const TrackGroupWrapper = styled.div`
  margin-bottom: 0.5rem;

  button {
    padding: 0.35rem 0.35rem;
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: 0;
    margin-bottom: 1rem;
    margin-top: 0rem;
  }

  @media screen and (max-width: ${bp.small}px) {
    font-size: var(--mi-font-size-small);

    button {
      padding: 0.25rem 0.25rem;
      height: 1.4rem;
    }
  }
`;

const TrackGroupLinks = styled.div`
  font-size: var(--mi-font-size-small);
  margin-bottom: 0.5rem;
  padding-top: 0.5rem;
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  align-items: start;
  min-height: 2.5rem;
  width: 100%;
  @media screen and (max-width: ${bp.medium}px) {
    align-items: start;
    margin-bottom: 0rem;
  }
`;

const TrackGroupInfo = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  a:first-of-type {
    font-weight: normal;
    margin-bottom: 0.2rem;
  }
  a:last-of-type {
    font-size: var(--mi-font-size-xsmall);
    color: var(--mi-light-foreground-color);
  }

  a:hover {
    text-decoration: underline;
  }
`;

const ArtistSquare: React.FC<{
  artist: Artist;
}> = ({ artist }) => {
  return (
    <TrackGroupWrapper>
      <div>
        <ImageWithPlaceholder
          src={artist.avatar?.sizes?.[300]}
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
