import { css } from "@emotion/css";
import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import AlbumForm from "./AlbumForm";
import BulkTrackUpload from "./BulkTrackUpload";
import ManageTrackTable from "./ManageTrackTable";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { useGlobalStateContext } from "state/GlobalState";
import Button from "components/common/Button";
import PublishButton from "./PublisButton";

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
    <div
      className={css`
        width: 100%;
      `}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
        `}
      >
        <h1>{t(trackGroup ? "editAlbum" : "createAlbum")}</h1>
        <div>
          {trackGroup && (
            <Link
              to={`/${artist.urlSlug?.toLowerCase()}/release/${trackGroup.urlSlug?.toLowerCase()}`}
              style={{ marginRight: ".5rem" }}
            >
              <Button compact>{t("view")}</Button>
            </Link>
          )}
          <Link to={`/manage/artists/${artist.id}/`}>
            <Button compact>{t("viewArtist")}</Button>
          </Link>
        </div>
      </div>
      {trackGroupId && trackGroup && (
        <AlbumForm existing={trackGroup} reload={reload} artist={artist} />
      )}
      {!trackGroupId && <AlbumForm reload={reload} artist={artist} />}

      {trackGroup && trackGroup?.tracks?.length > 0 && (
        <ManageTrackTable
          tracks={trackGroup.tracks}
          editable
          trackGroupId={trackGroup.id}
          owned
          reload={reload}
        />
      )}
      {trackGroup && trackGroup.tracks?.length > 0 && (
        <PublishButton trackGroup={trackGroup} reload={reload} />
      )}
      {trackGroup && (
        <BulkTrackUpload trackgroup={trackGroup} reload={reload} />
      )}
    </div>
  );
};

export default ManageTrackGroup;
