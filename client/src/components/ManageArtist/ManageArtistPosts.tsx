import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import api from "services/api";
import NewPostForm from "./NewPostForm";
import Box from "components/common/Box";
import { FaPen, FaTrash } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import PostForm from "./PostForm";
import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import { getPostURLReference } from "utils/artist";
import { FaPlus } from "react-icons/fa";
import { useArtistContext } from "state/ArtistContext";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { Link } from "react-router-dom";
import parse from "html-react-parser";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import { useAuthContext } from "state/AuthContext";

const ManageArtistPosts: React.FC<{}> = () => {
  const { user } = useAuthContext();
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });

  const snackbar = useSnackbar();
  const {
    state: { artist },
  } = useArtistContext();

  const [addingNewPost, setAddingNewPost] = React.useState(false);
  const [managePost, setManagePost] = React.useState<Post>();

  const [posts, setPosts] = React.useState<Post[]>([]);

  const userId = user?.id;
  const artistId = artist?.id;
  const fetchPosts = React.useCallback(async () => {
    if (userId) {
      const fetchedPosts = await api.getMany<Post>(
        `users/${userId}/posts?artistId=${artistId}`
      );
      setPosts(fetchedPosts.results);
    }
  }, [artistId, userId]);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const deletePost = React.useCallback(
    async (postId: number) => {
      try {
        const confirmed = window.confirm(t("areYouSureDelete") ?? "");
        if (confirmed) {
          await api.delete(`users/${userId}/posts/${postId}`);
          snackbar(t("postDeleted"), { type: "success" });
          fetchPosts();
        }
      } catch (e) {
        console.error(e);
      }
    },
    [fetchPosts, snackbar, userId, t]
  );

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <SpaceBetweenDiv>
        <div />
        <Button
          transparent
          onClick={() => {
            setAddingNewPost(true);
          }}
          startIcon={<FaPlus />}
          compact
          variant="dashed"
        >
          {t("addNewPost", { artist: artist.name })}
        </Button>
      </SpaceBetweenDiv>
      {posts?.map((p) => (
        <Box
          key={p.id}
          className={css`
            margin-bottom: 1rem;
            background-color: var(--mi-darken-background-color);
          `}
        >
          <SpaceBetweenDiv
            className={css`
              display: flex;
              flex-direction: column;
            `}
          >
            <div
              className={css`
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
                width: 100%;
                display: flex;
                justify-content: space-between;
                padding-bottom: 0.5rem;
                border-bottom: var(--mi-border);
              `}
            >
              <Link
                to={getPostURLReference({ ...p, artist })}
                className={css`
                  width: 80%;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  h2 {
                    margin-right: 1rem;
                  }
                `}
              >
                <h2>{p.title}</h2>
              </Link>
              <div
                className={css`
                  display: flex;
                `}
              >
                <Link to={`/manage/artists/${p.artistId}/post/${p.id}`}>
                  <Button onlyIcon variant="dashed" startIcon={<FaPen />} />
                </Link>
                <Button
                  className={css`
                    margin-left: 0.5rem;
                  `}
                  startIcon={<FaTrash />}
                  onClick={() => deletePost(p.id)}
                ></Button>
              </div>
            </div>
            <p
              className={css`
                color: grey;
                margin-bottom: 1rem;
                text-align: left;
                width: 100%;
              `}
            >
              {new Date(p.publishedAt) > new Date() && (
                <>
                  will publish{" "}
                  {formatDate({
                    date: p.publishedAt,
                    i18n,
                    options: { dateStyle: "short" },
                  })}
                </>
              )}
              {new Date(p.publishedAt) <= new Date() && (
                <>published at {formatDate({ date: p.publishedAt, i18n })}</>
              )}
            </p>
          </SpaceBetweenDiv>
          <MarkdownWrapper>{parse(p.content)}</MarkdownWrapper>
        </Box>
      ))}
      {managePost && (
        <Modal
          open={!!managePost}
          onClose={() => setManagePost(undefined)}
          title={t("editPost") ?? ""}
        >
          <PostForm existing={managePost} reload={fetchPosts} artist={artist} />
        </Modal>
      )}

      <NewPostForm
        open={addingNewPost}
        onClose={() => setAddingNewPost(false)}
        reload={fetchPosts}
        artist={artist}
      />
    </ManageSectionWrapper>
  );
};

export default ManageArtistPosts;
