import React from "react";

import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import {
  TrackGroupInfo,
  TrackGroupLinks,
  TrackGroupWrapper,
} from "components/Artist/ArtistTrackGroup";
import ArtistItemLink from "components/Artist/ArtistItemLink";
import ArtistLink from "components/Artist/ArtistLink";
import { Link } from "react-router-dom";

const ArtistMerchListItem: React.FC<{
  merch: Merch & { artist?: Artist };
  as?: React.ElementType<any, keyof React.JSX.IntrinsicElements>;
}> = ({ merch, as }) => {
  const merchImageUrl =
    merch.images?.[0]?.sizes?.[600] + "?" + merch.images?.[0]?.updatedAt;
  console.log(merchImageUrl);
  return (
    <TrackGroupWrapper as={as}>
      <div>
        <Link to={merch.id}>
          <ImageWithPlaceholder
            src={merchImageUrl}
            alt={merch.title}
            size={400}
            square
          />
        </Link>
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
