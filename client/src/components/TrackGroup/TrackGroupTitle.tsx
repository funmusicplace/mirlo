import { css } from "@emotion/css";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import ClickToPlayAlbum from "../common/ClickToPlayAlbum";
import Button, { ButtonLink } from "../common/Button";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";

import { bp } from "../../constants";
import DropdownMenu from "components/common/DropdownMenu";
import TrackGroupAdminMenu from "./TrackGroupAdminMenu";

import React from "react";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { useAuthContext } from "state/AuthContext";
import FlagContent from "./FlagContent";
import ArtistByLine from "./ArtistByLine";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";

export const ItemViewTitle: React.FC<{
  title: string;
  trackGroupId?: number;
}> = ({ title, trackGroupId }) => {
  return (
    <div
      className={css`
        display: flex;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        align-items: center;
        justify-content: flex-start;
        max-width: 80%;
      `}
    >
      {trackGroupId && (
        <div
          className={css`
            @media screen and (max-width: ${bp.small}px) {
              display: none;
            }
          `}
        >
          <ClickToPlayAlbum
            trackGroupId={trackGroupId}
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
            font-size: 2rem;
            line-height: 2.2rem;
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

  const ownedByUser = artist.userId === user?.id;

  return (
    <>
      <ItemViewTitle trackGroupId={trackGroup.id} title={title} />
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
          fromAlbum={title !== trackGroup.title ? trackGroup : undefined}
        />
        <div
          className={css`
            text-align: right;
            display: flex;
            align-items: center;
          `}
        >
          {(ownedByUser || user?.isAdmin) && (
            <ButtonLink
              size="compact"
              startIcon={<FaPen />}
              variant="dashed"
              to={`/manage/artists/${artist.id}/release/${trackGroup.id}`}
              style={{ marginRight: "1rem" }}
            >
              {t("edit")}
            </ButtonLink>
          )}
          <FlagContent trackGroupId={trackGroup.id} />
          {user?.isAdmin && (
            <div
              className={css`
                padding-left: 1rem;
              `}
            >
              <DropdownMenu compact>
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
