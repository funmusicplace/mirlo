import ArtistRouterLink, {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import Box from "components/common/Box";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Table from "components/common/Table";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import parse from "html-react-parser";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen, FaTrash } from "react-icons/fa";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getManagePostURLReference, getPostURLReference } from "utils/artist";

import { ManageSectionWrapper } from "../ManageSectionWrapper";

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
    if (userId && artistId) {
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
        isPublic: false,
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

  const draftPosts = posts.filter((p) => p.isDraft);
  const publishedPosts = posts.filter((p) => !p.isDraft);

  return (
    <ManageSectionWrapper>
      <SpaceBetweenDiv>
        <div />
        <ArtistButton
          onClick={createPost}
          startIcon={<FaPlus />}
          size="compact"
          variant="dashed"
        >
          {t("addNewPost", { artist: artist.name })}
        </ArtistButton>
      </SpaceBetweenDiv>

      {draftPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3">{t("drafts")}</h2>
          <Table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-bold border-b border-[var(--mi-border)] text-[var(--mi-light-foreground-color)]">
                  {t("postTitle")}
                </th>
                <th className="px-3 py-2 text-left text-sm font-bold border-b border-[var(--mi-border)] text-[var(--mi-light-foreground-color)]">
                  {t("publicationDate")}
                </th>
                <th className="px-3 py-2 text-left text-sm font-bold border-b border-[var(--mi-border)] text-[var(--mi-light-foreground-color)]">
                  {t("featuredImage")}
                </th>
                <th className="border-b border-[var(--mi-border)]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mi-border)]">
              {draftPosts.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 align-middle">
                    <ArtistRouterLink to={getManagePostURLReference(p)}>
                      {p.title === "" || !p.title ? (
                        <span className="italic">{t("untitledPost")}</span>
                      ) : (
                        p.title
                      )}
                    </ArtistRouterLink>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {formatDate({
                      date: p.publishedAt,
                      i18n,
                      options: { dateStyle: "short" },
                    })}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {p.featuredImage && (
                      <img
                        src={p.featuredImage.src}
                        alt=""
                        className="w-12 h-12 object-cover rounded-sm"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex justify-end gap-2">
                      <ArtistButtonLink
                        aria-label={t("editPost")}
                        to={getManagePostURLReference(p)}
                        onlyIcon
                        variant="dashed"
                        startIcon={<FaPen />}
                      />
                      <ArtistButton
                        aria-label={t("deletePost")}
                        startIcon={<FaTrash />}
                        onClick={() => deletePost(p.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {publishedPosts.length > 0 && (
        <ol>
          {publishedPosts.map((p) => (
            <Box as="li" key={p.id} className="mb-4 bg-[var(--mi-tint-color)]">
              <SpaceBetweenDiv className="flex flex-col">
                <div className="mt-2 mb-2 w-full flex justify-between pb-2 border-b border-[var(--mi-border)]">
                  <ArtistRouterLink
                    to={getPostURLReference({ ...p, artist })}
                    className="w-4/5 flex justify-start items-start [&_h2]:mr-4"
                  >
                    <h2>
                      {p.title === "" || !p.title ? (
                        <span className="italic">{t("untitledPost")}</span>
                      ) : (
                        p.title
                      )}
                    </h2>
                  </ArtistRouterLink>
                  <div className="flex">
                    <ArtistButtonLink
                      aria-label={t("editPost")}
                      to={getManagePostURLReference(p)}
                      onlyIcon
                      variant="dashed"
                      startIcon={<FaPen />}
                    />
                    <ArtistButton
                      aria-label={t("deletePost")}
                      className="ml-2"
                      startIcon={<FaTrash />}
                      onClick={() => deletePost(p.id)}
                    />
                  </div>
                </div>
                <p className="text-gray-500 mb-4 text-left w-full">
                  {new Date(p.publishedAt) > new Date() &&
                    t("willPublishAt", {
                      date: formatDate({
                        date: p.publishedAt,
                        i18n,
                        options: { dateStyle: "short" },
                      }),
                    })}
                  {new Date(p.publishedAt) <= new Date() &&
                    t("publishedAt", {
                      date: formatDate({ date: p.publishedAt, i18n }),
                    })}
                </p>
              </SpaceBetweenDiv>
              <MarkdownWrapper className="line-clamp-2">
                {parse(p.content ?? "")}
              </MarkdownWrapper>
            </Box>
          ))}
        </ol>
      )}
    </ManageSectionWrapper>
  );
};

export default ManageArtistPosts;
