import { css } from "@emotion/css";
import React from "react";
// import BuyAlbumButton from "./BuyAlbumButton";
import ClickToPlay from "./ClickToPlay";
import OverflowableText from "./OverflowableText";
import ShareTrackgroupButton from "./ShareTrackgroupButton";
import Tags from "./Tags";
import TrackTable from "./TrackTable";

interface ReleaseDetails {
  tracks?: Track[];
  id: number;
  image: Image;
  title?: string;
  about: string;
  tags?: string[];
  creatorId: string;
  slug: string;
}

const Release: React.FC<{ release: ReleaseDetails }> = ({ release }) => {
  const [items] = React.useState(release.tracks ?? []);
  return (
    <div key={release.id} style={{ marginBottom: "1rem" }}>
      <div
        className={css`
          display: flex;
          margin-bottom: 1rem;
        `}
      >
        <ClickToPlay
          image={{
            ...release.image?.small,
            width: release.image?.small?.width ?? 120,
            height: release.image?.small?.height ?? 120,
          }}
          title={release.title ?? ""}
          trackGroupId={release.id}
          trackGroupType="trackgroup"
          className={css`
            margin: 0 1rem 1rem 0;
          `}
        />
        <div>
          <h4>{release.title}</h4>

          {release.about && (
            <div
              className={css`
                margin-bottom: 1rem;
              `}
            >
              <OverflowableText text={release.about} />
            </div>
          )}
          <Tags tags={release.tags ?? []} />
          <div
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            <ShareTrackgroupButton trackgroup={release} />
            {/* <BuyAlbumButton trackgroup={release} /> */}
          </div>
        </div>
      </div>
      <TrackTable tracks={items} />
    </div>
  );
};

export default Release;
