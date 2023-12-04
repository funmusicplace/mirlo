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
        max-width: 32.2%;
        flex: 32.2%;
        overflow: hidden;
        text-overflow: ellipsis;

        &:nth-child(3n + 1) {
          border-top: 0;
          margin-right: 1.7%;
          margin-left: 0rem;
        }

        &:nth-child(3n) {
          border-top: 0;
          margin-left: 1.7%;
          margin-right: 0rem;
        }

        button {
          padding: 0.35rem 0.35rem;
        }

        @media screen and (max-width: ${bp.medium}px) {
          max-width: 48.5%;
          flex: 48.5%;
          padding: 0;
          margin-bottom: 1rem;
          margin-top: 0rem;

          &:nth-child(odd) {
            margin-left: 0rem;
            margin-right: 1.5%;
          }

          &:nth-child(even) {
            margin-right: 0rem;
            margin-left: 1.5%;
          }

          @media screen and (max-width: ${bp.small}px) {
            font-size: var(--mi-font-size-small);

            button {
              padding: 0.25rem 0.25rem;
              height: 1.4rem;
              width: 1.4rem;
            }
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
          `}
        >
          <div
            className={css`
              display: flex;
              flex-direction: column;
              width: 100%;

              a:first-child {
                font-weight: normal;
                margin-bottom: 0.2rem;
              }
              a:last-child {
                font-size: var(--mi-font-size-xsmall);
                color: var(--mi-light-foreground-color);
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
          <div
            className={css`
              button {
                margin-top: -0.25rem;
              }
              @media screen and (max-width: ${bp.small}px) {
                button {
                  margin-top: -0.1rem;
                  color: var(--mi-light-foreground-color);
                }
              }
            `}
          >
            <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistTrackGroup;
