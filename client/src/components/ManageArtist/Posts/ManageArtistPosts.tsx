import { css } from "@emotion/css";
import Button, { ButtonLink } from "components/common/Button";
import React from "react";
import api from "services/api";
import Box from "components/common/Box";
import { FaPen, FaTrash } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import PostForm from "./PostForm";
import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import { getManagePostURLReference, getPostURLReference } from "utils/artist";
import { FaPlus } from "react-icons/fa";
import { useArtistContext } from "state/ArtistContext";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { ManageSectionWrapper } from "../ManageSectionWrapper";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { Link, useNavigate } from "react-router-dom";
import parse from "html-react-parser";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import { useAuthContext } from "state/AuthContext";
import Pill from "components/common/Pill";

const ManageArtistPosts: React.FC<{}> = () => {
  const { user } = useAuthContext();
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const navigate = useNavigate();

  const snackbar = useSnackbar();
  const {
    state: { artist },
  } = useArtistContext();

  const [posts, setPosts] = React.useState<Post[]>([]);

  const userId = user?.id;
  const artistId = artist?.id;

  const fetchPosts = React.useCallback(async () => {
    if (userId) {
      const fetchedPosts = await api.getMany<Post>(
        `manage/posts?artistId=${artistId}`
      );
      setPosts(fetchedPosts.results);
    }
  }, [artistId, userId]);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = React.useCallback(async () => {
    if (artistId) {
      const response = await api.post<
        Partial<Post>,
        { result: { id: number } }
      >(`manage/posts`, {
        title: "",
        content: "",
        artistId: artistId,
      });
      navigate(`/manage/artists/${artistId}/post/${response.result.id}/`);
    }
  }, [artistId]);

  const deletePost = React.useCallback(
    async (postId: number) => {
      try {
        const confirmed = window.confirm(t("areYouSureDeletePost") ?? "");
        if (confirmed) {
          await api.delete(`manage/posts/${postId}`);
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
          onClick={createPost}
          startIcon={<FaPlus />}
          size="compact"
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
                to={
                  p.isDraft
                    ? getManagePostURLReference(p)
                    : getPostURLReference({ ...p, artist })
                }
                className={css`
                  width: 80%;
                  display: flex;
                  justify-content: flex-start;
                  align-items: flex-start;
                  h2 {
                    margin-right: 1rem;
                  }
                `}
              >
                {p.isDraft && (
                  <Pill
                    className={css`
                      margin-right: 0.5rem;
                    `}
                  >
                    Draft
                  </Pill>
                )}

                <h2>
                  {p.title === "" || !p.title ? (
                    <span
                      className={css`
                        font-style: italic;
                      `}
                    >
                      No title
                    </span>
                  ) : (
                    p.title
                  )}
                </h2>
              </Link>
              <div
                className={css`
                  display: flex;
                `}
              >
                <ButtonLink
                  to={getManagePostURLReference(p)}
                  onlyIcon
                  variant="dashed"
                  startIcon={<FaPen />}
                />
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
              {new Date(p.publishedAt) > new Date() &&
                t("willPublishAt", {
                  date: formatDate({
                    date: p.publishedAt,
                    i18n,
                    options: { dateStyle: "short" },
                  }),
                })}
              {!p.isDraft &&
                new Date(p.publishedAt) <= new Date() &&
                t("publishedAt", {
                  date: formatDate({ date: p.publishedAt, i18n }),
                })}
            </p>
          </SpaceBetweenDiv>
          <MarkdownWrapper>{parse(p.content ?? "")}</MarkdownWrapper>
        </Box>
      ))}
    </ManageSectionWrapper>
  );
};

export default ManageArtistPosts;
