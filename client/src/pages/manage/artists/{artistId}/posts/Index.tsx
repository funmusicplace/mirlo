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
import usePagination from "utils/usePagination";

import { ManageSectionWrapper } from "components/ManageArtist/ManageSectionWrapper";

import ManageArtistPostRow from "components/ManageArtist/Posts/ManageArtistPostRow";

const PAGE_SIZE = 10;

interface PostSectionProps {
  title: string;
  filterName: string;
  filterValue: string;
  onFilterChange: (v: string) => void;
  tierOptions: { value: string; label: string }[];
  posts: Post[];
  allPosts: Post[];
  total: number;
  PaginationComponent: React.FC<{ amount: number; total: number }>;
  artist: Artist;
  onDelete: (id: number) => void;
  className?: string;
}

const PostSection: React.FC<PostSectionProps> = ({
  title,
  filterName,
  filterValue,
  onFilterChange,
  tierOptions,
  posts,
  allPosts,
  total,
  PaginationComponent,
  artist,
  onDelete,
  className,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  if (total === 0) return null;
  return (
    <div className={className}>
      <h2 className="mb-3">{title}</h2>
      <FilterGroup
        legend={t("filterByTier")}
        name={filterName}
        options={tierOptions}
        compact
        value={filterValue}
        onChange={onFilterChange}
      />
      <ol>
        {posts.map((p) => (
          <ManageArtistPostRow
            key={p.id}
            post={p}
            artist={artist}
            onDelete={onDelete}
          />
        ))}
      </ol>
      <PaginationComponent amount={allPosts.length} total={total} />
    </div>
  );
};

const Index: React.FC<{}> = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { data: artist } = useManagedArtistQuery();

  const artistId = artist?.id;

  const { page: draftsPage, PaginationComponent: DraftsPagination } =
    usePagination({ pageSize: PAGE_SIZE, pageParam: "dpage" });
  const { page: queuedPage, PaginationComponent: QueuedPagination } =
    usePagination({ pageSize: PAGE_SIZE, pageParam: "qpage" });
  const { page: publishedPage, PaginationComponent: PublishedPagination } =
    usePagination({ pageSize: PAGE_SIZE, pageParam: "ppage" });

  const { data: draftsData } = useQuery(
    queryManagedArtistPosts(artistId ?? 0, {
      skip: draftsPage * PAGE_SIZE,
      take: PAGE_SIZE,
      isDraft: true,
    })
  );
  const { data: queuedData } = useQuery(
    queryManagedArtistPosts(artistId ?? 0, {
      skip: queuedPage * PAGE_SIZE,
      take: PAGE_SIZE,
      isDraft: false,
      isScheduled: true,
    })
  );
  const { data: publishedData } = useQuery(
    queryManagedArtistPosts(artistId ?? 0, {
      skip: publishedPage * PAGE_SIZE,
      take: PAGE_SIZE,
      isDraft: false,
      isScheduled: false,
    })
  );

  const allDraftPosts = draftsData?.results ?? [];
  const allQueuedPosts = queuedData?.results ?? [];
  const allPublishedPosts = publishedData?.results ?? [];
  const draftsTotal = draftsData?.total ?? 0;
  const queuedTotal = queuedData?.total ?? 0;
  const publishedTotal = publishedData?.total ?? 0;

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
  const [queuedTierFilter, setQueuedTierFilter] = React.useState<string>("all");
  const [publishedTierFilter, setPublishedTierFilter] =
    React.useState<string>("all");

  if (!artist) {
    return null;
  }

  const tierOptions = [
    { value: "all", label: t("allTiers") },
    { value: "public", label: t("publicLabel") },
    ...(artist.subscriptionTiers ?? []).map((tier) => ({
      value: String(tier.id),
      label: tier.name,
    })),
  ];

  const matchesTierFilter = (post: Post, filter: string) => {
    if (filter === "all") return true;
    if (filter === "public") return post.isPublic;
    return !post.isPublic && String(post.minimumSubscriptionTierId) === filter;
  };

  const draftPosts = allDraftPosts.filter((p) =>
    matchesTierFilter(p, draftsTierFilter)
  );
  const queuedPosts = allQueuedPosts.filter((p) =>
    matchesTierFilter(p, queuedTierFilter)
  );
  const publishedPosts = allPublishedPosts.filter((p) =>
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

      <PostSection
        title={t("drafts")}
        filterName="drafts-tier-filter"
        filterValue={draftsTierFilter}
        onFilterChange={setDraftsTierFilter}
        tierOptions={tierOptions}
        posts={draftPosts}
        allPosts={allDraftPosts}
        total={draftsTotal}
        PaginationComponent={DraftsPagination}
        artist={artist}
        onDelete={deletePost}
        className="mb-8"
      />
      <PostSection
        title={t("queuedPosts")}
        filterName="queued-tier-filter"
        filterValue={queuedTierFilter}
        onFilterChange={setQueuedTierFilter}
        tierOptions={tierOptions}
        posts={queuedPosts}
        allPosts={allQueuedPosts}
        total={queuedTotal}
        PaginationComponent={QueuedPagination}
        artist={artist}
        onDelete={deletePost}
        className="mb-8"
      />
      <PostSection
        title={t("publishedPosts")}
        filterName="published-tier-filter"
        filterValue={publishedTierFilter}
        onFilterChange={setPublishedTierFilter}
        tierOptions={tierOptions}
        posts={publishedPosts}
        allPosts={allPublishedPosts}
        total={publishedTotal}
        PaginationComponent={PublishedPagination}
        artist={artist}
        onDelete={deletePost}
      />
    </ManageSectionWrapper>
  );
};

export default Index;
