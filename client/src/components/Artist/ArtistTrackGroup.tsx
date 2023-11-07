import { css } from "@emotion/css";
import React from "react";
import ClickToPlay from "../common/ClickToPlay";
import { Link } from "react-router-dom";
import { useArtistContext } from "state/ArtistContext";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import { bp } from "../../constants";

const ArtistTrackGroup: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const { state } = useArtistContext();

  if (!trackGroup || (!state?.artist && !trackGroup.artist)) {
    return null;
  }

  const { artist } = state ?? trackGroup;

  return (
    <div
      key={trackGroup.id}
      className={css`
        margin-bottom: 1rem;
        display: inline-block;
        padding: 0 .5%;
        max-width: 33%;
        flex: 33%;

        &:nth-child(3) {
          border-top: 0;
          margin-right: 0;
        }

        @media screen and (max-width: ${bp.medium}px) {
          max-width: 49.9%;
          flex: 49.9%;
          padding: 0 1%;
          margin-bottom: .5rem;
          margin-top: .5rem;

          button {
            padding: .2rem .4rem;
          }
          &:nth-child(1) {
            border-top: 0;
          }
          @media screen and (max-width: ${bp.small}px) {
                      font-size: .8rem;
          }
        }
      `}
    >
      <div>

        <ClickToPlay
          image={{
            width: 400,
            height: 400,
            url: trackGroup.cover?.sizes?.[600] ?? "",
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
          <div
            className={css`
              display: flex;
              flex-direction: row;

              a:first-child {
                font-weight: normal;
                margin-bottom: 0.4rem;
              }
            `}
          >
          <Link
            to={`/${artist?.urlSlug ?? artist?.id}/release/${
              trackGroup.urlSlug ?? trackGroup.id
            }`}
            className={css`
                text-decoration: none;
                padding-right: .5rem;

                :hover {
                  text-decoration: underline;
                }
            `}>
            {trackGroup.title}
          </Link>
            <Link to={`/${artist?.urlSlug ?? artist?.id}/`}>
              {trackGroup.artist?.name}
            </Link>
          </div>
          <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
        </div>
      </div>
    </div>
  );
};

export default ArtistTrackGroup;
