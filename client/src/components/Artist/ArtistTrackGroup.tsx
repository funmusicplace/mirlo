import { css } from "@emotion/css";
import React from "react";
import ClickToPlay from "../common/ClickToPlay";
import { Link } from "react-router-dom";
import { useArtistContext } from "state/ArtistContext";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";

const ArtistTrackGroup: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const {
    state: { artist },
  } = useArtistContext();

  if (!trackGroup || !artist) {
    return null;
  }

  return (
    <div
      key={trackGroup.id}
      className={css`
        margin-bottom: 1rem;
        margin-top: 1rem;
        display: inline-block;
        max-width: 300px;
        margin-right: 0.5rem;
        &:nth-child(2) {
          border-top: 0;
        }
      `}
    >
      <div
        className={css`
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: space-between;

          & > :first-child {
            margin-right: 0.5rem;
          }
        `}
      >
        <ClickToPlay
          image={{
            width: 300,
            height: 300,
            url: trackGroup.cover?.sizes?.[300] ?? "",
          }}
          trackGroupId={trackGroup.id}
          title={trackGroup.title}
        />
        <div
          className={css`
            display: flex;
            justify-content: space-between;
            align-items: top;
            width: 100%;
            padding-top: 0.5rem;
          `}
        >
          <Link
            to={`/${artist.urlSlug ?? trackGroup.artistId}/tg/${
              trackGroup.urlSlug ?? trackGroup.id
            }`}
          >
            {trackGroup.title}
          </Link>
          <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
        </div>
      </div>
    </div>
  );
};

export default ArtistTrackGroup;
