import React from "react";
import Modal from "components/common/Modal";
import TrackTable from "../common/TrackTable";
import AlbumForm from "./AlbumForm";
import NewTrack from "./NewTrack";
import api from "services/api";

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

  React.useEffect(() => {
    if (trackgroup.tracks) {
      setTracks(trackgroup.tracks);
    }
  }, [trackgroup.tracks]);

  const reloadTrackGroup = React.useCallback(async () => {
    try {
      const response = await api.get<{ trackgroup: TrackGroup }>(
        `users/${artist.userId}/trackGroups/${trackgroup.id}`
      );
      setTracks(response.trackgroup.tracks);
    } catch (e) {
      console.log(e);
    }
  }, [artist.userId, trackgroup.id]);

  return (
    <Modal open={open} onClose={onClose}>
      {/* There is some overly complex state management going on here with the reloads being passed around */}
      <AlbumForm existing={trackgroup} reload={reload} artist={artist} />
      <TrackTable
        tracks={tracks}
        editable
        trackGroupId={trackgroup.id}
        owned
        reload={reloadTrackGroup}
      />
      <NewTrack trackgroup={trackgroup} reload={reload} />
    </Modal>
  );
};

export default ManageAlbumForm;
