import { css } from "@emotion/css";
import React from "react";
import ClickToPlay from "../common/ClickToPlay";
import { Link } from "react-router-dom";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import { bp } from "../../constants";
import { useArtistContext } from "state/ArtistContext";

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
        margin-bottom: 0.5rem;
        display: inline-block;
        max-width: 33.3%;
        flex: 33.3%;
        padding: 0 0.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &:nth-child(3n + 1) {
          border-top: 0;
          padding-right: 0.5rem;
          padding-left: 0rem;
        }

        &:nth-child(3n) {
          border-top: 0;
          padding-left: 0.5rem;
          padding-right: 0rem;
        }

        @media screen and (max-width: ${bp.medium}px) {
          max-width: 50%;
          flex: 50%;
          margin-bottom: 1rem;
          margin-top: 0rem;

          &:nth-child(odd) {
            padding-left: 0rem;
            padding-right: 0.25rem;
          }

          &:nth-child(even) {
            padding-right: 0rem;
            padding-left: 0.25rem;
          }

          button {
            padding: 0.2rem 0.4rem;
          }

          @media screen and (max-width: ${bp.small}px) {
            font-size: var(--mi-font-size-small);
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
            flex-wrap: wrap;
            align-items: start;
            width: 100%;
            padding-top: 0.5rem;
          `}
        >
          <div
            className={css`
              display: flex;
              flex-direction: column;
              width: 80%;

              a:first-child {
                font-weight: normal;
                margin-bottom: 0.2rem;
              }
              a:last-child {
                font-size: var(--mi-font-size-xsmall);
                font-weight: bold;
              }

              a {
                text-decoration: none;
                text-overflow: ellipsis;

                overflow: hidden;
              }

              a:hover {
                text-decoration: underline;
              }
            `}
          >
            <Link
              to={`/${artist?.urlSlug ?? artist?.id}/release/${
                trackGroup.urlSlug ?? trackGroup.id
              }`}
            >
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
