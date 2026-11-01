import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { between, bp, coverSizeMax } from "../../constants";
import ClickToPlayTracks from "../common/ClickToPlayTracks";

import ArtistByLine, {
  FromAlbum,
  getReleaseLabel,
  OnLabel,
} from "./ArtistByLine";

const TitleHeading = styled.h1`
  font-size: clamp(
    1.25rem,
    calc(var(--cover-size, ${coverSizeMax}) / 14),
    2rem
  );
  font-weight: 600;
  line-height: 1.1;
  margin: 0;
`;

const CenteredTitleHeading = styled(TitleHeading)`
  line-height: 1.15;
  text-wrap: balance;
  overflow-wrap: anywhere;

  @media screen and (max-width: ${bp.small}px) {
    font-size: 1.5rem;
  }
`;

const ReleaseTitleHeading = styled(TitleHeading)`
  @media screen and (max-width: ${bp.small}px) {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
`;

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
        <TitleHeading>{title}</TitleHeading>
      </div>
    </div>
  );
};

const TrackGroupTitle: React.FC<{
  trackGroup: TrackGroup;
  title: string;
  centered?: boolean;
  subtitle?: React.ReactNode;
  coArtists?: React.ReactElement;
}> = ({ trackGroup, title, centered, subtitle, coArtists }) => {
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

  if (centered) {
    const label = getReleaseLabel(artist, trackGroup);
    const showFromAlbum = !!trackGroup.title && title !== trackGroup.title;

    return (
      <div className="flex flex-col items-center gap-1 max-w-2xl mx-auto text-center">
        <CenteredTitleHeading>{title}</CenteredTitleHeading>
        {subtitle && (
          <div className="text-lg text-balance wrap-anywhere">{subtitle}</div>
        )}
        <ArtistByLine
          artist={artist}
          trackGroup={trackGroup}
          hideLabel
          coArtists={coArtists}
        />
        {(showFromAlbum || label) && (
          <div className="text-base text-balance wrap-anywhere">
            {showFromAlbum && (
              <FromAlbum artist={artist} trackGroup={trackGroup} />
            )}
            {showFromAlbum && label && (
              <>
                {" "}
                <span aria-hidden>·</span>{" "}
              </>
            )}
            {label && <OnLabel label={label} standalone={!showFromAlbum} />}
          </div>
        )}
      </div>
    );
  }

  const playableTrackIds = trackGroup.tracks
    .filter((t) => t.isPlayable)
    .map((t) => t.id);

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
      {playableTrackIds.length > 0 && (
        <ClickToPlayTracks
          trackIds={playableTrackIds}
          className={css`
            --play-size: clamp(
              2.75rem,
              calc(var(--cover-size, ${coverSizeMax}) / 7.5),
              3.75rem
            );

            flex-shrink: 0;
            margin-right: 0.5rem;

            && button {
              width: var(--play-size);
              height: var(--play-size);
            }

            && .startIcon {
              font-size: calc(var(--play-size) * 0.45) !important;
            }

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
        <ReleaseTitleHeading>{title}</ReleaseTitleHeading>
        <ArtistByLine artist={artist} trackGroup={trackGroup} />
      </div>
    </div>
  );
};

export default TrackGroupTitle;
