import React from "react";
import ClickToPlay from "../../common/ClickToPlay";

import ArtistLink from "../../Artist/ArtistLink";
import ArtistItemLink from "../../Artist/ArtistItemLink";
import {
  TrackGroupInfo,
  TrackGroupLinks,
  TrackGroupWrapper,
} from "components/Artist/ArtistTrackGroup";

const CollectionPurchaseSquare: React.FC<{
  trackGroup: TrackGroup & { artist?: Artist };
  track?: Track;
  as?: React.ElementType<any, keyof React.JSX.IntrinsicElements>;
}> = ({ trackGroup, track, as }) => {
  return (
    <TrackGroupWrapper as={as}>
      <div>
        <ClickToPlay
          image={{
            width: 400,
            height: 400,
            url: trackGroup.cover?.sizes?.[600] ?? "",
          }}
          trackIds={
            track ? [track.id] : trackGroup.tracks.map((track) => track.id)
          }
          title={track?.title ?? trackGroup.title ?? ""}
          trackGroup={trackGroup}
          track={track}
        >
          <TrackGroupLinks>
            <TrackGroupInfo>
              <ArtistItemLink item={track ?? trackGroup} />
              <ArtistLink artist={trackGroup.artist} />
            </TrackGroupInfo>
          </TrackGroupLinks>
        </ClickToPlay>
      </div>
    </TrackGroupWrapper>
  );
};

export default CollectionPurchaseSquare;
