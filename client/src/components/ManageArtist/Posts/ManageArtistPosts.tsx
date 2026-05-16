import { ArtistButton } from "components/Artist/ArtistButtons";
import SectionActionStrip from "components/common/SectionActionStrip";
import FilterGroup from "components/Profile/UserNotificationFeed/FilterGroup";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import { ManageSectionWrapper } from "../ManageSectionWrapper";

import ManageArtistPostRow from "./ManageArtistPostRow";

const ManageArtistPosts: React.FC<{}> = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", {
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

  const [draftsTierFilter, setDraftsTierFilter] = React.useState<string>("all");
  const [publishedTierFilter, setPublishedTierFilter] =
    React.useState<string>("all");

  if (!artist) {
    return null;
  }

  const tierOptions = [
    { value: "all", label: t("allTiers") },
    ...(artist.subscriptionTiers ?? []).map((tier) => ({
      value: String(tier.id),
      label: tier.name,
    })),
  ];

  const matchesTierFilter = (post: Post, filter: string) =>
    filter === "all" || String(post.minimumSubscriptionTierId) === filter;

  const allDrafts = posts.filter((p) => p.isDraft);
  const allPublished = posts.filter((p) => !p.isDraft);
  const draftPosts = allDrafts.filter((p) =>
    matchesTierFilter(p, draftsTierFilter)
  );
  const publishedPosts = allPublished.filter((p) =>
    matchesTierFilter(p, publishedTierFilter)
  );

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

      {allDrafts.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3">{t("drafts")}</h2>
          <FilterGroup
            legend={t("filterByTier")}
            name="drafts-tier-filter"
            options={tierOptions}
            compact
            value={draftsTierFilter}
            onChange={setDraftsTierFilter}
          />
          <ol>
            {draftPosts.map((p) => (
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

      {allPublished.length > 0 && (
        <div>
          <h2 className="mb-3">{t("publishedPosts")}</h2>
          <FilterGroup
            legend={t("filterByTier")}
            name="published-tier-filter"
            options={tierOptions}
            compact
            value={publishedTierFilter}
            onChange={setPublishedTierFilter}
          />
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
