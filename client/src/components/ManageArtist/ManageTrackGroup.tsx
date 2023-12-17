import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import AlbumForm from "./AlbumForm";
import BulkTrackUpload from "./BulkTrackUpload";
import ManageTrackTable from "./ManageTrackTable";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { useGlobalStateContext } from "state/GlobalState";
import PublishButton from "./PublisButton";
import NewAlbumForm from "./NewAlbumForm";
import HeaderDiv from "components/common/HeaderDiv";
import ManageSectionWrapper from "./ManageSectionWrapper";
import { css } from "@emotion/css";
import { FaChevronLeft } from "react-icons/fa";
import Tooltip from "components/common/Tooltip";

const ManageTrackGroup: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const { artistId, trackGroupId } = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();
  const {
    state: { artist },
  } = useArtistContext();

  const userId = user?.id;

  const { object: trackGroup, reload } = useGetUserObjectById<TrackGroup>(
    "trackGroups",
    userId,
    trackGroupId,
    `?artistId=${artistId}`
  );

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper
      className={css`
        padding-top: 1rem !important;
      `}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        `}
      >
        <Tooltip hoverText="Back to artist" underline={false}>
          <Link
            className={css`
              display: flex;
              align-items: center;
              font-size: 1.2rem;
              padding-bottom: 1rem;
            `}
            to={`/manage/artists/${artist.id}/`}
          >
            <FaChevronLeft
              className={css`
                margin-right: 0.5rem;
                font-size: 1.2rem;
              `}
            />
            {artist.name}
          </Link>
        </Tooltip>
        <HeaderDiv>
          <h1
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            <span className={css``}>
              {t(trackGroup ? "editAlbum" : "createAlbum")}
            </span>
          </h1>
          <div
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            {trackGroup && trackGroup.tracks?.length > 0 && (
              <PublishButton trackGroup={trackGroup} reload={reload} />
            )}
          </div>
        </HeaderDiv>
      </div>
      {trackGroupId && trackGroup && (
        <AlbumForm existing={trackGroup} reload={reload} artist={artist} />
      )}
      {!trackGroupId && <NewAlbumForm reload={reload} artist={artist} />}

      {trackGroup && trackGroup?.tracks?.length > 0 && (
        <ManageTrackTable
          tracks={trackGroup.tracks}
          editable
          trackGroupId={trackGroup.id}
          owned
          reload={reload}
        />
      )}

      {trackGroup && (
        <BulkTrackUpload trackgroup={trackGroup} reload={reload} />
      )}
      <hr style={{ marginTop: "1rem", marginBottom: "1rem" }} />
      {trackGroup && trackGroup.tracks?.length > 0 && (
        <PublishButton trackGroup={trackGroup} reload={reload} />
      )}
    </ManageSectionWrapper>
  );
};

export default ManageTrackGroup;
