import { css } from "@emotion/css";
import Button from "components/common/Button";
import Table from "components/common/Table";
import React from "react";
import { FaCheck, FaEye, FaPen } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "services/api";
import ArtistForm from "./ArtistForm";
import ManageAlbumForm from "./ManageAlbumForm";
import NewAlbumForm from "./NewAlbumForm";

const ArtistListItem: React.FC<{
  artist: Artist;
  reload: () => Promise<void>;
}> = ({ artist, reload }) => {
  console.log("artist", artist);
  const [manageTrackgroup, setManageTrackgroup] = React.useState<TrackGroup>();
  const [addingNewAlbum, setAddingNewAlbum] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);
  const albumId = manageTrackgroup?.id;

  const reloadWrapper = React.useCallback(async () => {
    if (albumId) {
      const tg = await api.get<TrackGroup>(
        `users/${artist.userId}/trackGroups/${albumId}`
      );
      setManageTrackgroup(tg);
    }
    await reload();
  }, [albumId, artist.userId, reload]);

  React.useEffect(() => {
    const callback = async () => {
      const trackGroups = await api.get<TrackGroup[]>(
        `users/${artist.userId}/trackGroups`
      );
      setTrackGroups(trackGroups);
    };
    callback();
  }, [artist.userId]);

  return (
    <div
      key={artist.id}
      className={css`
        margin-bottom: 2rem;
      `}
    >
      <ArtistForm
        open={isEditing}
        onClose={() => setIsEditing(false)}
        existing={artist}
        reload={reloadWrapper}
      />
      <div
        className={css`
          display: flex;
          width: 100%;
          justify-content: flex-end;
        `}
      >
        <h4 style={{ flexGrow: 1 }}>Artist: {artist.name}</h4>
        <span>
          <Button
            compact
            startIcon={<FaPen />}
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        </span>
        <Link to={`/library/artist/${artist.id}`}>
          <Button compact startIcon={<FaEye />}>
            View
          </Button>
        </Link>
      </div>
      <h5>Your albums</h5>
      <Table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Display artist</th>
            <th className="alignRight">Private</th>
            <th className="alignRight">Enabled</th>
            <th className="alignRight">Tracks</th>
            <th className="alignRight">Release date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trackGroups?.map((album) => (
            <tr key={album.id}>
              <td>{album.title}</td>
              <td>{artist.name}</td>
              <td className="alignRight">
                {album.published ? <FaCheck /> : ""}
              </td>
              <td className="alignRight">{album.enabled ? <FaCheck /> : ""}</td>
              <td className="alignRight">{album.tracks.length}</td>
              <td className="alignRight">{album.releaseDate?.split("T")[0]}</td>

              <td className="alignRight">
                <Button
                  compact
                  onClick={() => {
                    setManageTrackgroup(album);
                  }}
                >
                  Manage
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {manageTrackgroup && (
        <ManageAlbumForm
          open={!!manageTrackgroup}
          trackgroup={manageTrackgroup}
          onClose={() => setManageTrackgroup(undefined)}
          reload={reloadWrapper}
          artist={artist}
        />
      )}
      <Button
        onClick={() => {
          setAddingNewAlbum(true);
        }}
        style={{ marginTop: "1rem" }}
      >
        Add new album to {artist.name}
      </Button>
      <NewAlbumForm
        open={addingNewAlbum}
        onClose={() => setAddingNewAlbum(false)}
        reload={reload}
        artist={artist}
      />
    </div>
  );
};

export default ArtistListItem;
