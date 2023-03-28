import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import ReactMarkdown from "react-markdown";
import { useGlobalStateContext } from "state/GlobalState";
import NewPostForm from "./NewPostForm";
import Box from "components/common/Box";
import { FaPen, FaTrash } from "react-icons/fa";

const ManageArtistPosts: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();
  const [addingNewPost, setAddingNewPost] = React.useState(false);

  const [posts, setPosts] = React.useState<Post[]>([]);

  const userId = user?.id;
  React.useEffect(() => {
    const callback = async () => {
      if (userId) {
        const result = await api.get<{ artist: Artist }>(
          `users/${userId}/artists/${artistId}`
        );
        setArtist(result.artist);
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
    <div>
      <h2>Posts</h2>
      {posts?.map((p) => (
        <Box
          key={p.id}
          className={css`
            margin-bottom: 1rem;
          `}
        >
          <div
            className={css`
              display: flex;
              justify-content: space-between;
            `}
          >
            <strong>{p.title}:</strong>
            <div>
              <Button compact startIcon={<FaPen />}>
                Edit
              </Button>
              <Button
                className={css`
                  margin-left: 0.5rem;
                `}
                compact
                startIcon={<FaTrash />}
              >
                Delete
              </Button>
            </div>
          </div>
          <ReactMarkdown>{p.content}</ReactMarkdown>
        </Box>
      ))}
      <Button
        onClick={() => {
          setAddingNewPost(true);
        }}
        className={css`
          width: 100%;
        `}
      >
        Add new post to {artist.name}
      </Button>
      <NewPostForm
        open={addingNewPost}
        onClose={() => setAddingNewPost(false)}
        reload={() => {
          return Promise.resolve();
        }}
        artist={artist}
      />
    </div>
  );
};

export default ManageArtistPosts;
