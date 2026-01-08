import React, { forwardRef } from "react";
import ClickToPlay from "../common/ClickToPlay";
import { bp } from "../../constants";
import styled from "@emotion/styled";
import ArtistLink from "./ArtistLink";
import ArtistItemLink from "./ArtistItemLink";
import { ArtistButton } from "./ArtistButtons";
import { FaCrosshairs, FaICursor } from "react-icons/fa";
import { css } from "@emotion/css";

export const TrackGroupWrapper = styled.div`
  margin-bottom: 0.5rem;

  img {
    width: 100% !important;
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

export const TrackGroupLinks = styled.div`
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

export const TrackGroupInfo = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  a {
    text-decoration: none;
  }
  a:first-of-type {
    font-weight: normal;
    margin-bottom: 0.2rem;
  }
  a:not(:first-of-type) {
    font-size: var(--mi-font-size-xsmall);
  }

  a:hover {
    text-decoration: underline;
  }
`;

type ArtistTrackGroupProps = {
  showArtist?: boolean;
  trackGroup: TrackGroup & { artist?: Artist };
  as?: React.ElementType<any, keyof React.JSX.IntrinsicElements>;
  size?: "small" | "large";
  showTrackFavorite?: boolean;
  myRef?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
};

const ArtistTrackGroup: React.FC<ArtistTrackGroupProps> = ({
  trackGroup,
  as,
  showArtist,
  showTrackFavorite,
  size = "large",
  myRef,
  ...props
}) => {
  const length = size === "small" ? 300 : 300;
  return (
    <TrackGroupWrapper as={as} ref={myRef} {...props}>
      <div
        className={css`
          position: relative;
        `}
      >
        <ClickToPlay
          image={{
            width: length,
            height: length,
            url: trackGroup.cover?.sizes?.[size === "small" ? 300 : 300] ?? "",
          }}
          trackIds={trackGroup.tracks.map((t) => t.id)}
          title={trackGroup.title ?? ""}
          trackGroup={trackGroup}
          showWishlist={!showTrackFavorite}
          showTrackFavorite={showTrackFavorite}
        >
          <TrackGroupLinks>
            <TrackGroupInfo>
              <ArtistItemLink item={trackGroup} />
              {showArtist && <ArtistLink artist={trackGroup.artist} />}
            </TrackGroupInfo>
          </TrackGroupLinks>
        </ClickToPlay>
      </div>
    </TrackGroupWrapper>
  );
};

export default ArtistTrackGroup;
