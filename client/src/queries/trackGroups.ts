import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getInjectedTrackGroup } from "utils/injectedData";

import * as api from "./fetch/fetchWrapper";
import {
  QUERY_KEY_TRACK_GROUPS,
  QUERY_KEY_SALES,
  queryKeyIncludes,
  QUERY_KEY_AUTH,
} from "./queryKeys";

export type TrackGroupQueryOptions = {
  skip?: number;
  take?: number;
  orderBy?: "random";
  tag?: string;
  locationSlug?: string;
  title?: string;
  distinctArtists?: boolean;
  isReleased?: "released" | "not-released";
  license?: "public-domain" | "all-rights-reserved" | "creative-commons";
};

const fetchTrackGroups: QueryFunction<
  { results: TrackGroup[]; total?: number },
  ["fetchTrackGroups", TrackGroupQueryOptions, ...any]
> = ({
  queryKey: [
    _,
    {
      skip,
      take,
      orderBy,
      title,
      tag,
      locationSlug,
      distinctArtists,
      isReleased,
      license,
    },
  ],
  signal,
}) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (orderBy) params.append("orderBy", orderBy);
  if (tag) params.append("tag", tag);
  if (title) params.append("title", title);
  if (locationSlug) params.append("locationSlug", locationSlug);
  if (isReleased) params.append("isReleased", isReleased);
  if (license) params.append("license", license);

  params.append("distinctArtists", String(distinctArtists ?? false));
  return api.get(`v1/trackGroups?${params}`, { signal });
};

export function queryTrackGroups(opts: TrackGroupQueryOptions) {
  return queryOptions({
    queryKey: ["fetchTrackGroups", opts, QUERY_KEY_TRACK_GROUPS],
    queryFn: fetchTrackGroups,
  });
}

type TopSoldQueryOptions = Pick<TrackGroupQueryOptions, "skip" | "take"> & {
  datePurchased?: "pastMonth";
};

const fetchTopSoldTrackGroups: QueryFunction<
  { results: TrackGroup[]; total?: number },
  ["fetchTopSoldTrackGroups", TopSoldQueryOptions, ...any]
> = ({ queryKey: [_, { skip, take, datePurchased }], signal }) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (datePurchased) params.append("datePurchased", datePurchased);

  return api.get(`v1/trackGroups/topSold?${params}`, { signal });
};

export function queryTopSoldTrackGroups(opts: TopSoldQueryOptions) {
  return queryOptions({
    queryKey: ["fetchTopSoldTrackGroups", opts, QUERY_KEY_TRACK_GROUPS],
    queryFn: fetchTopSoldTrackGroups,
  });
}

const fetchTrackGroup: QueryFunction<
  TrackGroup,
  ["fetchTrackGroup", { albumSlug?: string | null; artistId?: string }]
> = ({ queryKey: [_, { albumSlug, artistId }], signal }) => {
  return api
    .get<{
      result: TrackGroup;
    }>(
      `v1/trackGroups/${albumSlug}/${artistId ? `?artistId=${artistId}` : ""}`,
      {
        signal,
      }
    )
    .then((r) => r.result);
};

export function queryTrackGroup(opts: {
  albumSlug?: string | null;
  artistId?: string;
}) {
  return queryOptions({
    queryKey: [
      "fetchTrackGroup",
      {
        albumSlug: opts.albumSlug,
        artistId: opts.artistId,
      },
    ],
    queryFn: fetchTrackGroup,
    initialData: () => getInjectedTrackGroup(opts.albumSlug || ""),
    enabled: !!opts.albumSlug,
  });
}

async function createTrackGroup(opts: {
  trackGroup: Partial<TrackGroup>;
}): Promise<{ result: TrackGroup }> {
  return await api.post(
    `v1/manage/artists/${opts.trackGroup.artistId}/trackGroups`,
    opts.trackGroup
  );
}

export function useCreateTrackGroupMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createTrackGroup,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => queryKeyIncludes(query, QUERY_KEY_TRACK_GROUPS),
      });
    },
  });
}

async function updateTrackGroup(opts: {
  trackGroupId: number;
  trackGroup: Partial<TrackGroup>;
}) {
  await api.put(`v1/manage/trackGroups/${opts.trackGroupId}`, opts.trackGroup);
}

export function useUpdateTrackGroupMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateTrackGroup,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => queryKeyIncludes(query, QUERY_KEY_TRACK_GROUPS),
      });
    },
  });
}

const toIsoOrNull = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const toCentsOrNull = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
};

async function saveAlbumForm(opts: {
  formData: import("../components/ManageArtist/ManageTrackGroup/ManageTrackGroup").TrackGroupFormData;
  trackGroupId: number;
  artistId: number;
  fundraiserId?: number;
}) {
  const { formData, trackGroupId, artistId, fundraiserId } = opts;
  const trackGroupPayload = {
    title: formData.title,
    about: formData.about,
    credits: formData.credits,
    releaseDate: toIsoOrNull(formData.releaseDate),
    publishedAt: toIsoOrNull(formData.publishedAt),
    minPrice: toCentsOrNull(formData.minPrice),
    suggestedPrice: toCentsOrNull(formData.suggestedPrice),
    catalogNumber: formData.catalogNumber,
    urlSlug: formData.urlSlug,
    isPublic: formData.isPublic,
    isGettable: formData.isGettable,
    platformPercent:
      formData.platformPercent !== undefined && formData.platformPercent !== ""
        ? Number(formData.platformPercent)
        : undefined,
    artistId,
  };

  const requests: [
    Promise<{ result: TrackGroup }>,
    Promise<{ result: Fundraiser }> | undefined,
  ] = [
    api.put<unknown, { result: TrackGroup }>(
      `v1/manage/trackGroups/${trackGroupId}`,
      trackGroupPayload
    ),
    undefined,
  ];

  if (fundraiserId) {
    requests[1] = api.put<unknown, { result: Fundraiser }>(
      `v1/manage/fundraisers/${fundraiserId}`,
      {
        goalAmount: toCentsOrNull(formData.goalAmount) ?? 0,
        isAllOrNothing: !!formData.isAllOrNothing,
      }
    );
  }

  return Promise.all(requests);
}

export function useSaveAlbumFormMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveAlbumForm,
    // Not awaited on purpose, SaveDraftBar resets the form right after mutateAsync resolves.
    // Awaiting would delay that reset past slow refetches, letting it race with
    // and remove the user's next click.
    onSuccess() {
      void client.invalidateQueries({
        predicate: (query) => queryKeyIncludes(query, QUERY_KEY_TRACK_GROUPS),
      });
    },
  });
}

async function bulkSetTracksIsPreview(opts: {
  trackGroupId: number;
  isPreview: boolean;
}) {
  return api.put(`v1/manage/trackGroups/${opts.trackGroupId}/tracks`, {
    isPreview: opts.isPreview,
  });
}

export function useBulkSetTracksIsPreviewMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: bulkSetTracksIsPreview,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => queryKeyIncludes(query, QUERY_KEY_TRACK_GROUPS),
      });
    },
  });
}

async function updatePledge(opts: { fundraiserId: number; amount: number }) {
  await api.put(`v1/fundraisers/${opts.fundraiserId}/changePledge`, {
    amount: opts.amount,
  });
}

export function useUpdatePledgeMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updatePledge,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) =>
          queryKeyIncludes(query, QUERY_KEY_TRACK_GROUPS) ||
          queryKeyIncludes(query, QUERY_KEY_AUTH) ||
          queryKeyIncludes(query, QUERY_KEY_SALES),
      });
    },
  });
}

async function deletePledge({ fundraiserId }: { fundraiserId: number }) {
  return api.del(`v1/fundraisers/${fundraiserId}/changePledge`);
}

export function useDeletePledgeMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deletePledge,
    async onSuccess(_, {}) {
      await client.invalidateQueries({
        predicate: (query) =>
          queryKeyIncludes(query, QUERY_KEY_TRACK_GROUPS) ||
          queryKeyIncludes(query, QUERY_KEY_AUTH) ||
          queryKeyIncludes(query, QUERY_KEY_SALES),
      });
    },
  });
}

async function deleteTrackGroup(opts: { trackGroupId: number }) {
  await api.del(`v1/manage/trackGroups/${opts.trackGroupId}`);
}

export function useDeleteTrackGroupMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteTrackGroup,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => queryKeyIncludes(query, QUERY_KEY_TRACK_GROUPS),
      });
    },
  });
}

const fetchManagedFundraiser: QueryFunction<
  Fundraiser,
  ["fetchManagedFundraiser", { fundraiserId: number }, ...any]
> = ({ queryKey: [_, { fundraiserId }], signal }) => {
  return api
    .get<{
      result: Fundraiser;
    }>(`v1/manage/fundraisers/${fundraiserId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedFundraiser(fundraiserId: number) {
  return queryOptions({
    queryKey: [
      "fetchManagedFundraiser",
      { fundraiserId },
      QUERY_KEY_TRACK_GROUPS,
    ],
    queryFn: fetchManagedFundraiser,
    enabled: isFinite(fundraiserId),
  });
}

const fetchFundraiserPledges: QueryFunction<
  { results: FundraiserPledge[]; total: number },
  [
    "fetchFundraiserPledges",
    { fundraiserId: number; includeCancelled?: boolean },
    ...any,
  ]
> = ({ queryKey: [_, { fundraiserId, includeCancelled }], signal }) => {
  const params = new URLSearchParams();
  if (includeCancelled) {
    params.append("includeCancelled", "true");
  }
  return api.get(`v1/manage/fundraisers/${fundraiserId}/pledges?${params}`, {
    signal,
  });
};

export function queryFundraiserPledges(opts: {
  fundraiserId: number;
  includeCancelled?: boolean;
}) {
  return queryOptions({
    queryKey: [
      "fetchFundraiserPledges",
      {
        fundraiserId: opts.fundraiserId,
        includeCancelled: opts.includeCancelled,
      },
      QUERY_KEY_TRACK_GROUPS,
    ],
    queryFn: fetchFundraiserPledges,
  });
}

const fetchTrackGroupSupporters: QueryFunction<
  {
    results: {
      name: string;
      amount: number;
      message?: string;
      datePurchased: string;
    }[];
    total: number;
    totalAmount: number;
    totalSupporters: number;
    totalPledges?: number;
  },
  [
    "fetchTrackGroupSupporters",
    trackGroupId: number,
    opts?: {
      take?: number;
      skip?: number;
      trackGroupId?: number;
    },
    ...any,
  ]
> = ({ queryKey: [_, trackGroupId, opts], signal }) => {
  const params = new URLSearchParams();

  if (opts?.take) {
    params.append("take", String(opts.take));
  }
  if (opts?.skip) {
    params.append("skip", String(opts.skip));
  }
  return api.get(
    `v1/trackGroups/${trackGroupId}/supporters/?${params.toString()}`,
    {
      signal,
    }
  );
};

export function queryTrackGroupSupporters(
  trackGroupId: number,
  opts?: {
    take?: number;
    skip?: number;
  }
) {
  return queryOptions({
    queryKey: [
      "fetchTrackGroupSupporters",
      trackGroupId,
      opts,
      QUERY_KEY_SALES,
    ],
    queryFn: fetchTrackGroupSupporters,
  });
}

const fetchManagedRecommendedTrackGroups: QueryFunction<
  { results: TrackGroup[] },
  ["fetchManagedRecommendedTrackGroups", { trackGroupId: number }, ...any]
> = ({ queryKey: [_, { trackGroupId }], signal }) => {
  return api.get<{ results: TrackGroup[] }>(
    `v1/manage/trackGroups/${trackGroupId}/recommendedTrackGroups`,
    {
      signal,
    }
  );
};

export function queryManagedRecommendedTrackGroups(trackGroupId: number) {
  return queryOptions({
    queryKey: [
      "fetchManagedRecommendedTrackGroups",
      { trackGroupId },
      QUERY_KEY_TRACK_GROUPS,
    ],
    queryFn: fetchManagedRecommendedTrackGroups,
    enabled: isFinite(trackGroupId),
  });
}

const fetchPublicRecommendedTrackGroups: QueryFunction<
  { results: TrackGroup[] },
  ["fetchPublicRecommendedTrackGroups", { trackGroupId: number }, ...any]
> = ({ queryKey: [_, { trackGroupId }], signal }) => {
  return api.get<{ results: TrackGroup[] }>(
    `v1/trackGroups/${trackGroupId}/recommendedTrackGroups`,
    {
      signal,
    }
  );
};

export function queryPublicRecommendedTrackGroups(trackGroupId: number) {
  return queryOptions({
    queryKey: [
      "fetchPublicRecommendedTrackGroups",
      { trackGroupId },
      QUERY_KEY_TRACK_GROUPS,
    ],
    queryFn: fetchPublicRecommendedTrackGroups,
    enabled: isFinite(trackGroupId),
  });
}

async function addRecommendedTrackGroup(opts: {
  trackGroupId: number;
  recommendedTrackGroupId: number;
}) {
  return api.put(
    `v1/manage/trackGroups/${opts.trackGroupId}/recommendedTrackGroups`,
    {
      recommendedTrackGroupId: opts.recommendedTrackGroupId,
    }
  );
}

export function useAddRecommendedTrackGroupMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: addRecommendedTrackGroup,
    async onSuccess(_, { trackGroupId }) {
      await client.invalidateQueries({
        queryKey: [
          "fetchManagedRecommendedTrackGroups",
          { trackGroupId },
          QUERY_KEY_TRACK_GROUPS,
        ],
      });
    },
  });
}

async function removeRecommendedTrackGroup(opts: {
  trackGroupId: number;
  recommendedTrackGroupId: number;
}) {
  return api.del(
    `v1/manage/trackGroups/${opts.trackGroupId}/recommendedTrackGroups?recommendedTrackGroupId=${opts.recommendedTrackGroupId}`
  );
}

export function useRemoveRecommendedTrackGroupMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: removeRecommendedTrackGroup,
    async onSuccess(_, { trackGroupId }) {
      await client.invalidateQueries({
        queryKey: [
          "fetchManagedRecommendedTrackGroups",
          { trackGroupId },
          QUERY_KEY_TRACK_GROUPS,
        ],
      });
    },
  });
}
