import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { between, bp } from "../../constants";
import ClickToPlayTracks from "../common/ClickToPlayTracks";

import ArtistByLine, { FromAlbum } from "./ArtistByLine";
import { coverSizeMax } from "pages/:artistId/release/:trackGroupId/Index";

export const ItemViewTitle: React.FC<{
  title: string;
  trackIds?: number[];
  showPlayButton?: boolean;
}> = ({ title, trackIds, showPlayButton }) => {
  return (
    <div
      className={css`
        display: flex;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        align-items: center;
        justify-content: flex-start;
        max-width: 80%;

        @media ${between(bp.medium, bp.xlarge)} {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
      `}
    >
      {showPlayButton && (
        <div
          className={css`
            @media screen and (max-width: ${bp.small}px) {
              display: none;
            }
          `}
        >
          <ClickToPlayTracks
            trackIds={trackIds ?? []}
            className={css`
              width: 50px !important;
              margin-right: 10px;
            `}
          />
        </div>
      )}
      <div>
        <h1
          className={css`
            font-size: clamp(
              1.25rem,
              calc(var(--cover-size, ${coverSizeMax}) / 14),
              2rem
            );
            font-weight: 600;
            line-height: 1.1;
            margin: 0;
          `}
        >
          {title}
        </h1>
      </div>
    </div>
  );
};

const TrackGroupTitle: React.FC<{
  trackGroup: TrackGroup;
  title: string;
}> = ({ trackGroup, title }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const params = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: params.artistId ?? "" })
  );

  if (!artist && !isLoadingArtist) {
    return <LoadingBlocks rows={1} />;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;

        @media screen and (max-width: ${bp.small}px) {
          margin-bottom: 0.75rem;
        }
      `}
    >
      {trackGroup.tracks.length > 0 && (
        <ClickToPlayTracks
          trackIds={trackGroup.tracks
            .filter((t) => t.isPlayable)
            .map((t) => t.id)}
          className={css`
            width: 64px !important;
            flex-shrink: 0;

            @media screen and (max-width: ${bp.small}px) {
              display: none;
            }
          `}
        />
      )}
      <div
        className={css`
          min-width: 0;
          flex: 1;
        `}
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h1
            className={css`
              font-size: clamp(
                1.25rem,
                calc(var(--cover-size, ${coverSizeMax}) / 14),
                2rem
              );
              font-weight: 600;
              line-height: 1.1;
              margin: 0;

              @media screen and (max-width: ${bp.small}px) {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
              }
            `}
          >
            {title}
          </h1>
          {title !== trackGroup.title && (
            <span className="hidden sm:inline text-base font-normal opacity-70">
              <FromAlbum artist={artist} trackGroup={trackGroup} />
            </span>
          )}
        </div>
        <ArtistByLine
          artist={artist}
          trackGroup={trackGroup}
          showFromAlbum={title !== trackGroup.title}
        />
      </div>
    </div>
  );
};

export default TrackGroupTitle;
