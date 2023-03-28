import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { FaEye, FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import ReactMarkdown from "react-markdown";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistForm from "./ArtistForm";
import ManageAlbumForm from "./ManageAlbumForm";
import NewAlbumForm from "./NewAlbumForm";
import NewPostForm from "./NewPostForm";
import TrackGroupCard from "./TrackGroupCard";
import ManageArtistPosts from "./ManageArtistPosts";
import ManageArtistAlbums from "./ManageArtistAlbums";
import ManageArtistSubscriptionTiers from "./ManageArtistSubscriptionTiers";

const ManageArtist: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();
  const [manageTrackgroup, setManageTrackgroup] = React.useState<TrackGroup>();
  const [addingNewAlbum, setAddingNewAlbum] = React.useState(false);
  const [addingNewPost, setAddingNewPost] = React.useState(false);

  const [isEditing, setIsEditing] = React.useState(false);
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);
  const [posts, setPosts] = React.useState<Post[]>([]);

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
        const fetchedPosts = await api.get<{ results: Post[] }>(
          `users/${userId}/posts?artistId=${artistId}`
        );
        setPosts(fetchedPosts.results);
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
          flex-direction: column;
          margin-bottom: 2rem;
        `}
      >
        <h1 style={{ flexGrow: 1 }}>Manage: {artist.name}</h1>
        <div>
          <Button
            compact
            startIcon={<FaPen />}
            onClick={() => setIsEditing(true)}
            className={css`
              margin-right: 0.5rem;
            `}
          >
            Edit artist details
          </Button>
          <Link to={`/artist/${artist.id}`}>
            <Button compact startIcon={<FaEye />}>
              View live
            </Button>
          </Link>
        </div>
      </div>
      <ManageArtistAlbums />
      <ManageArtistPosts />
      <ManageArtistSubscriptionTiers />
    </div>
  );
};

export default ManageArtist;
