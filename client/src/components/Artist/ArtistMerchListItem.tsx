import React from "react";
import { bp } from "../../constants";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import ArtistLink from "./ArtistLink";
import ArtistItemLink from "./ArtistItemLink";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

export const TrackGroupWrapper = styled.div`
  margin-bottom: 0.5rem;

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
  a:last-of-type {
    font-size: var(--mi-font-size-xsmall);
    color: var(--mi-light-foreground-color);
  }

  a:hover {
    text-decoration: underline;
  }
`;

const ArtistMerchListItem: React.FC<{
  merch: Merch & { artist?: Artist };
  as?: React.ElementType<any, keyof React.JSX.IntrinsicElements>;
}> = ({ merch, as }) => {
  const { t } = useTranslation("translation", { keyPrefix: "clickToPlay" });
  const merchImageUrl = merch.images?.[0]?.sizes?.[600];
  console.log(merchImageUrl);
  return (
    <TrackGroupWrapper as={as}>
      <div>
        <ImageWithPlaceholder
          src={merchImageUrl}
          alt={merch.title}
          size={400}
          square
        />
        <TrackGroupLinks>
          <TrackGroupInfo>
            <ArtistItemLink item={merch} />
            <ArtistLink artist={merch.artist} />
          </TrackGroupInfo>
        </TrackGroupLinks>
      </div>
    </TrackGroupWrapper>
  );
};

export default ArtistMerchListItem;
