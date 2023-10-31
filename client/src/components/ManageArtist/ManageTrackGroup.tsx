import { css } from "@emotion/css";
import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import AlbumForm from "./AlbumForm";
import BulkTrackUpload from "./BulkTrackUpload";
import ManageTrackTable from "./ManageTrackTable";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import Button from "components/common/Button";

const ManageTrackGroup: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();

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

  const artistUserId = artist?.userId;

  const publishTrackGroup = React.useCallback(async () => {
    try {
      if (artistUserId && trackGroupId) {
        await api.put(
          `users/${artistUserId}/trackGroups/${trackGroupId}/publish`,
          {}
        );
        snackbar(t("publishedSuccess"), { type: "success" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      await reload();
    }
  }, [artistUserId, trackGroupId, snackbar, t, reload]);

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
      {trackGroup.tracks?.length > 0 && (
        <ManageTrackTable
          tracks={trackGroup.tracks}
          editable
          trackGroupId={trackGroup.id}
          owned
          reload={reload}
        />
      )}
      <div>
        <Button onClick={publishTrackGroup}>{t("publish")}</Button>
      </div>
      <BulkTrackUpload trackgroup={trackGroup} reload={reload} />
    </div>
  );
};

export default ManageTrackGroup;
