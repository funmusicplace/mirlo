import { css } from "@emotion/css";
import { FaFlag, FaPen } from "react-icons/fa";
import { Link } from "react-router-dom";
import ClickToPlayAlbum from "../common/ClickToPlayAlbum";
import Button from "../common/Button";
import { Trans, useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";

import { bp } from "../../constants";
import DropdownMenu from "components/common/DropdownMenu";
import TrackGroupAdminMenu from "./TrackGroupAdminMenu";

import React from "react";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { useAuthContext } from "state/AuthContext";
import FlagContent from "./FlagContent";

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
}> = ({ trackGroup }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const {
    state: { artist, isLoading: isLoadingArtist },
  } = useArtistContext();
  const { user } = useAuthContext();

  if (!artist && !isLoadingArtist) {
    return <LoadingBlocks rows={1} />;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  const ownedByUser = artist.userId === user?.id;

  return (
    <>
      <ItemViewTitle trackGroupId={trackGroup.id} title={trackGroup.title} />
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.6rem;
        `}
      >
        <div>
          {artist && (
            <em
              className={css`
                font-size: 18px;
                font-style: normal;
              `}
            >
              <Trans
                t={t}
                i18nKey="byArtist"
                values={{
                  artist: artist.name,
                }}
                components={{
                  artistLink: (
                    <Link
                      to={`/${artist.urlSlug?.toLowerCase() ?? artist.id}`}
                    ></Link>
                  ),
                }}
              />
            </em>
          )}
        </div>
        <div
          className={css`
            text-align: right;
            display: flex;
            align-items: center;
          `}
        >
          {(ownedByUser || user?.isAdmin) && (
            <Link
              to={`/manage/artists/${artist.id}/release/${trackGroup.id}`}
              style={{ marginRight: "0" }}
            >
              <Button compact startIcon={<FaPen />} variant="dashed">
                {t("edit")}
              </Button>
            </Link>
          )}
          <FlagContent trackGroupId={trackGroup.id} />
          {user?.isAdmin && (
            <div
              className={css`
                padding-left: 1rem;
              `}
            >
              <DropdownMenu compact>
                <TrackGroupAdminMenu trackGroup={trackGroup} />
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TrackGroupTitle;
