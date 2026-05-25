import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import DropdownMenu from "components/common/DropdownMenu";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

import { between, bp } from "../../constants";
import ClickToPlayTracks from "../common/ClickToPlayTracks";

import ArtistByLine from "./ArtistByLine";
import { coverSizeMax } from "./TrackGroup";
import TrackGroupAdminMenu from "./TrackGroupAdminMenu";

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

        @media screen and ${between(bp.medium, bp.xlarge)} {
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

  const { user } = useAuthContext();

  if (!artist && !isLoadingArtist) {
    return <LoadingBlocks rows={1} />;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <>
      <ItemViewTitle
        trackIds={trackGroup.tracks
          .filter((t) => t.isPlayable)
          .map((t) => t.id)}
        title={title}
        showPlayButton={trackGroup.tracks.length > 0}
      />
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.6rem;
        `}
      >
        <ArtistByLine
          artist={artist}
          trackGroup={trackGroup}
          showFromAlbum={title !== trackGroup.title}
        />
        <div
          className={css`
            text-align: right;
            display: flex;
            align-items: center;
          `}
        >
          {user?.isAdmin && (
            <div
              className={css`
                padding-left: 0.5rem;
                padding-right: 0.4rem;
              `}
            >
              <DropdownMenu smallIcon compact>
                <TrackGroupAdminMenu trackGroupId={trackGroup.id} />
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TrackGroupTitle;
