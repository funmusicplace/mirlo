import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import ManageAlbumForm from "./ManageAlbumForm";
import NewAlbumForm from "./NewAlbumForm";
import TrackGroupCard from "./TrackGroupCard";

const ManageArtistAlbums: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();
  const [manageTrackgroup, setManageTrackgroup] = React.useState<TrackGroup>();
  const [addingNewAlbum, setAddingNewAlbum] = React.useState(false);

  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);

  const userId = user?.id;
  React.useEffect(() => {
    const callback = async () => {
      if (userId) {
        const result = await api.get<{ artist: Artist }>(
          `users/${userId}/artists/${artistId}`
        );
        setArtist(result.artist);
        const fetchedTrackGroups = await api.get<{ results: TrackGroup[] }>(
          `users/${userId}/trackGroups?artistId=${artistId}`
        );
        setTrackGroups(fetchedTrackGroups.results);
      }
    };
    callback();
  }, [userId, artistId]);

  if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        margin-bottom: 2rem;
      `}
    >
      <h2>Your albums</h2>
      <div>
        {trackGroups?.map((album) => (
          <TrackGroupCard
            album={album}
            key={album.id}
            setManageTrackgroup={setManageTrackgroup}
          />
        ))}
      </div>
      {manageTrackgroup && (
        <ManageAlbumForm
          open={!!manageTrackgroup}
          trackgroup={manageTrackgroup}
          onClose={() => setManageTrackgroup(undefined)}
          reload={() => {
            return Promise.resolve();
          }}
          artist={artist}
        />
      )}
      <Button
        onClick={() => {
          setAddingNewAlbum(true);
        }}
        className={css`
          margin-top: 2rem;
          width: 100%;
        `}
      >
        Add new album to {artist.name}
      </Button>
      <NewAlbumForm
        open={addingNewAlbum}
        onClose={() => setAddingNewAlbum(false)}
        reload={() => {
          return Promise.resolve();
        }}
        artist={artist}
      />
    </div>
  );
};

export default ManageArtistAlbums;
