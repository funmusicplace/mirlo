import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import NewPostForm from "./NewPostForm";
import Box from "components/common/Box";
import { FaPen, FaTrash } from "react-icons/fa";
import PostContent from "components/common/PostContent";
import { useSnackbar } from "state/SnackbarContext";
import PostForm from "./PostForm";
import Modal from "components/common/Modal";

const ManageArtistPosts: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();
  const [addingNewPost, setAddingNewPost] = React.useState(false);
  const [managePost, setManagePost] = React.useState<Post>();

  const [posts, setPosts] = React.useState<Post[]>([]);

  const userId = user?.id;

  const fetchPosts = React.useCallback(async () => {
    if (userId) {
      const fetchedPosts = await api.getMany<Post>(
        `users/${userId}/posts?artistId=${artistId}`
      );
      setPosts(fetchedPosts.results);
    }
  }, [artistId, userId]);

  React.useEffect(() => {
    const callback = async () => {
      if (userId) {
        const { result } = await api.get<Artist>(
          `users/${userId}/artists/${artistId}`
        );
        setArtist(result);
      }
    };
    callback();
    fetchPosts();
  }, [userId, artistId, fetchPosts]);

  const deletePost = React.useCallback(
    async (postId: number) => {
      try {
        await api.delete(`users/${userId}/posts/${postId}`);
        snackbar("Post deleted", { type: "success" });
        fetchPosts();
      } catch (e) {
        console.error(e);
      }
    },
    [fetchPosts, snackbar, userId]
  );

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
              <Button
                compact
                startIcon={<FaPen />}
                onClick={() => setManagePost(p)}
              >
                Edit
              </Button>
              <Button
                className={css`
                  margin-left: 0.5rem;
                `}
                compact
                startIcon={<FaTrash />}
                onClick={() => deletePost(p.id)}
              >
                Delete
              </Button>
            </div>
          </div>
          <PostContent content={p.content} />
        </Box>
      ))}
      {managePost && (
        <Modal open={!!managePost} onClose={() => setManagePost(undefined)}>
          <PostForm existing={managePost} reload={fetchPosts} artist={artist} />
        </Modal>
      )}
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
        reload={fetchPosts}
        artist={artist}
      />
    </div>
  );
};

export default ManageArtistPosts;
