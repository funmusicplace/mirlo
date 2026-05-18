import ArtistRouterLink, {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import SectionActionStrip from "components/common/SectionActionStrip";
import Table from "components/common/Table";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen, FaTrash } from "react-icons/fa";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getManagePostURLReference } from "utils/artist";

import { ManageSectionWrapper } from "../ManageSectionWrapper";

import ManageArtistPostRow from "./ManageArtistPostRow";

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
      <SectionActionStrip>
        <ArtistButton
          onClick={createPost}
          startIcon={<FaPlus />}
          size="compact"
          variant="dashed"
          collapsible
        >
          {t("addNewPost", { artist: artist.name })}
        </ArtistButton>
      </SectionActionStrip>

      {draftPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3">{t("drafts")}</h2>
          <div className="border border-(--mi-tint-x-color)">
            <Table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-normal bg-(--mi-button-tint-color) text-(--mi-text-color)">
                    {t("postTitle")}
                  </th>
                  <th className="px-3 py-2 text-center font-normal bg-(--mi-button-tint-color) text-(--mi-text-color) border-l border-(--mi-tint-color)">
                    {t("publicationDate")}
                  </th>
                  <th className="px-3 py-2 text-center font-normal bg-(--mi-button-tint-color) text-(--mi-text-color) border-l border-(--mi-tint-color)">
                    {t("featuredImage")}
                  </th>
                  <th className="bg-(--mi-button-tint-color) border-l border-(--mi-tint-color)" />
                </tr>
              </thead>
              <tbody className="divide-y divide-(--mi-tint-color)">
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
                    <td className="px-3 py-2 text-center align-middle">
                      {formatDate({
                        date: p.publishedAt,
                        i18n,
                        options: { dateStyle: "short" },
                      })}
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      {p.featuredImage && (
                        <img
                          src={p.featuredImage.src}
                          alt=""
                          className="w-12 h-12 object-cover rounded-sm mx-auto"
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
        </div>
      )}

      {publishedPosts.length > 0 && (
        <div>
          <h2 className="mb-3">{t("publishedPosts")}</h2>
          <ol>
            {publishedPosts.map((p) => (
              <ManageArtistPostRow
                key={p.id}
                post={p}
                artist={artist}
                onDelete={deletePost}
              />
            ))}
          </ol>
        </div>
      )}
    </ManageSectionWrapper>
  );
};

export default ManageArtistPosts;
