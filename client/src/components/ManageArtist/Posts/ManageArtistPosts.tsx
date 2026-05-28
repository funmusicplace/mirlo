import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import SectionActionStrip from "components/common/SectionActionStrip";
import FilterGroup from "components/Profile/UserNotificationFeed/FilterGroup";
import {
  queryManagedArtistPosts,
  useCreatePostMutation,
  useDeletePostMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { ManageSectionWrapper } from "../ManageSectionWrapper";

import ManageArtistPostRow from "./ManageArtistPostRow";

const ManageArtistPosts: React.FC<{}> = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { data: artist } = useManagedArtistQuery();

  const artistId = artist?.id;

  const { data } = useQuery(queryManagedArtistPosts(artistId ?? 0));
  const posts = data?.results ?? [];

  const { mutate: createPost } = useCreatePostMutation();
  const { mutate: deletePostMutate } = useDeletePostMutation();

  const handleCreatePost = React.useCallback(() => {
    if (artistId) {
      createPost(
        { artistId },
        {
          onSuccess: (response) => {
            navigate(`/manage/artists/${artistId}/post/${response.result.id}/`);
          },
        }
      );
    }
  }, [artistId, createPost, navigate]);

  const deletePost = React.useCallback(
    (postId: number) => {
      const confirmed = window.confirm(t("areYouSureDeletePost") ?? "");
      if (confirmed && artistId) {
        deletePostMutate(
          { postId, artistId },
          {
            onSuccess: () => snackbar(t("postDeleted"), { type: "success" }),
            onError: (e) => console.error(e),
          }
        );
      }
    },
    [artistId, deletePostMutate, snackbar, t]
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
          onClick={handleCreatePost}
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
