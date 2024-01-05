import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import NewPostForm from "./NewPostForm";
import Box from "components/common/Box";
import { FaPen, FaTrash } from "react-icons/fa";
import MarkdownContent from "components/common/MarkdownContent";
import { useSnackbar } from "state/SnackbarContext";
import PostForm from "./PostForm";
import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import { FaPlus } from "react-icons/fa";
import { useArtistContext } from "state/ArtistContext";
import HeaderDiv from "components/common/HeaderDiv";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { Link } from "react-router-dom";

const ManageArtistPosts: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
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
        await api.delete(`users/${userId}/posts/${postId}`);
        snackbar(t("postDeleted"), { type: "success" });
        fetchPosts();
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
      <HeaderDiv>
        <div />
        <Button
          transparent
          onClick={() => {
            setAddingNewPost(true);
          }}
          startIcon={<FaPlus />}
          compact
        >
          {t("addNewPost", { artist: artist.name })}
        </Button>
      </HeaderDiv>
      {posts?.map((p) => (
        <Box
          key={p.id}
          className={css`
            margin-bottom: 1rem;
            background-color: var(--mi-darken-background-color);
          `}
        >
          <HeaderDiv
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
                justify-content: flex-end;
                padding-bottom: 0.5rem;
                border-bottom: var(--mi-border);
              `}
            >
              <Link
                to={`/post/${p.id}`}
                className={css`
                  width: 100%;
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
              <Link to={`/manage/artists/${p.artistId}/post/${p.id}`}>
                <Button onlyIcon startIcon={<FaPen />} />
              </Link>
              <Button
                className={css`
                  margin-left: 0.5rem;
                `}
                startIcon={<FaTrash />}
                onClick={() => deletePost(p.id)}
              ></Button>
            </div>
            <p
              className={css`
                color: grey;
              `}
            >
              published {formatDate({ date: p.publishedAt, i18n })}
            </p>
          </HeaderDiv>
          <MarkdownContent content={p.content} />
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
