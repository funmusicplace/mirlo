import { css } from "@emotion/css";
import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import AlbumForm from "./AlbumForm";
import usePublicObjectById from "utils/usePublicObjectById";
import BulkTrackUpload from "./BulkTrackUpload";
import ManageTrackTable from "./ManageTrackTable";

const ManageTrackGroup: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { artistId, trackGroupId } = useParams();
  const {
    state: { artist },
  } = useArtistContext();

  const { object: trackGroup, reload } = usePublicObjectById<TrackGroup>(
    "trackGroups",
    trackGroupId,
    `?artistId=${artistId}`
  );

  if (!trackGroup || !artist) {
    return null;
  }

  return (
    <div
      className={css`
        width: 100%;
      `}
    >
      <h1>{t("editAlbum")}</h1>
      <AlbumForm existing={trackGroup} reload={reload} artist={artist} />
      <ManageTrackTable
        tracks={trackGroup.tracks}
        editable
        trackGroupId={trackGroup.id}
        owned
        reload={reload}
      />
      <BulkTrackUpload trackgroup={trackGroup} reload={reload} />
    </div>
  );
};

export default ManageTrackGroup;
