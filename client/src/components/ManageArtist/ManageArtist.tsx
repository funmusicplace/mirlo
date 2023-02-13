import { css } from "@emotion/css";
import Button from "components/common/Button";
import Table from "components/common/Table";
import React from "react";
import { FaCheck, FaEye, FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistForm from "./ArtistForm";
import ManageAlbumForm from "./ManageAlbumForm";
import NewAlbumForm from "./NewAlbumForm";

const ManageArtist: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();
  const [manageTrackgroup, setManageTrackgroup] = React.useState<TrackGroup>();
  const [addingNewAlbum, setAddingNewAlbum] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);
  const albumId = manageTrackgroup?.id;

  const userId = user?.id;

  // const reloadWrapper = React.useCallback(async () => {
  //   if (albumId) {
  //     const tg = await api.get<{ trackgroup: TrackGroup }>(
  //       `users/${artist.userId}/trackGroups/${albumId}`
  //     );
  //     setManageTrackgroup(tg.trackgroup);
  //   }
  //   await reload();
  // }, [albumId, artist.userId, reload]);

  console.log("artistId", artistId, userId);
  React.useEffect(() => {
    const callback = async () => {
      if (userId) {
        const result = await api.get<{ artist: Artist }>(
          `users/${userId}/artists/${artistId}`
        );
        console.log("result", result);
        setArtist(result.artist);
        const trackGroups = await api.get<{ results: TrackGroup[] }>(
          `users/${userId}/trackGroups`
        );
        setTrackGroups(trackGroups.results);
      }
    };
    callback();
  }, [userId, artistId]);

  console.log("artist", artist);

  if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        margin-bottom: 2rem;
      `}
    >
      <ArtistForm
        open={isEditing}
        onClose={() => setIsEditing(false)}
        existing={artist}
        reload={() => {
          return Promise.resolve();
        }}
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
        style={{ marginTop: "1rem" }}
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

export default ManageArtist;
