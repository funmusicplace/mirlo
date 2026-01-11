import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
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
    { skip, take, orderBy, title, tag, distinctArtists, isReleased, license },
  ],
  signal,
}) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (orderBy) params.append("orderBy", orderBy);
  if (tag) params.append("tag", tag);
  if (title) params.append("title", title);
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

async function deleteTrackGroup(opts: {
  userId: number;
  trackGroupId: number;
}) {
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
