import { css } from "@emotion/css";
import { FaPen } from "react-icons/fa";
import { Link } from "react-router-dom";
import ClickToPlayAlbum from "../common/ClickToPlayAlbum";
import { useGlobalStateContext } from "state/GlobalState";
import Button from "../common/Button";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";

import { bp } from "../../constants";
import DropdownMenu from "components/common/DropdownMenu";
import TrackGroupAdminMenu from "./TrackGroupAdminMenu";

import React from "react";
import LoadingBlocks from "components/Artist/LoadingBlocks";

const TrackGroupTitle: React.FC<{ trackGroup: TrackGroup }> = ({
  trackGroup,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const {
    state: { artist, isLoading: isLoadingArtist },
  } = useArtistContext();
  const {
    state: { user },
  } = useGlobalStateContext();

  if (!artist && !isLoadingArtist) {
    return <LoadingBlocks rows={1} />;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  const ownedByUser = artist.userId === user?.id;

  return (
    <>
      <div>
        <div
          className={css`
            display: flex;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            align-items: center;
            justify-content: flex-start;
            align-items: center;
          `}
        >
          <div
            className={css`
              @media screen and (max-width: ${bp.small}px) {
                display: none;
              }
            `}
          >
            <ClickToPlayAlbum
              trackGroupId={trackGroup.id}
              className={css`
                width: 50px !important;
                margin-right: 10px;
              `}
            />
          </div>
          <div>
            <h1
              className={css`
                font-size: 2rem;
                line-height: 2.2rem;
              `}
            >
              {trackGroup.title}
            </h1>
          </div>
        </div>
      </div>

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
              by{" "}
              <Link to={`/${artist.urlSlug?.toLowerCase() ?? artist.id}`}>
                {artist?.name}
              </Link>
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
          {user?.isAdmin && (
            <div
              className={css`
                padding-left: 1rem;
              `}
            >
              <DropdownMenu compact>
                <>
                  <TrackGroupAdminMenu trackGroup={trackGroup} />
                </>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TrackGroupTitle;
