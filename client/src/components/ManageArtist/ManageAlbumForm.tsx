import React from "react";
import Modal from "components/common/Modal";
import ManageTrackTable from "./ManageTrackTable";
import AlbumForm from "./AlbumForm";
import api from "services/api";
import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { useSnackbar } from "state/SnackbarContext";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

export const ManageAlbumForm: React.FC<{
  open: boolean;
  onClose: () => void;
  trackgroup: TrackGroup;
  artist: Artist;
  reload: () => Promise<void>;
}> = ({ open, trackgroup, onClose, reload, artist }) => {
  const [tracks, setTracks] = React.useState<Track[]>([]);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();

  React.useEffect(() => {
    if (trackgroup.tracks) {
      setTracks(trackgroup.tracks);
    }
  }, [trackgroup.tracks]);

  const reloadTrackGroup = React.useCallback(async () => {
    try {
      const { result } = await api.get<TrackGroup>(
        `users/${artist.userId}/trackGroups/${trackgroup.id}`
      );
      setTracks(result.tracks);
    } catch (e) {
      console.error(e);
    } finally {
      await reload();
    }
  }, [artist.userId, trackgroup.id, reload]);

  const publishTrackGroup = React.useCallback(async () => {
    try {
      await api.put(
        `users/${artist.userId}/trackGroups/${trackgroup.id}/publish`,
        {}
      );
      snackbar(t("publishedSuccess"), { type: "success" });
    } catch (e) {
      console.error(e);
    } finally {
      await reload();
    }
  }, [artist.userId, trackgroup.id, snackbar, t, reload]);

  return (
    <Modal open={open} onClose={onClose} title={t("editAlbum") ?? ""}>
      {/* There is some overly complex state management going on here with the reloads being passed around */}
      <AlbumForm
        existing={trackgroup}
        reload={reloadTrackGroup}
        artist={artist}
      />
      <div>
        <Button onClick={publishTrackGroup}>{t("publish")}</Button>
      </div>
      <ManageTrackTable
        tracks={tracks}
        editable
        trackGroupId={trackgroup.id}
        owned
        reload={reloadTrackGroup}
      />
    </Modal>
  );
};

export default ManageAlbumForm;
