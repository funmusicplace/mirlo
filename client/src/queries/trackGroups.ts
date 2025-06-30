import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_TRACK_GROUPS, queryKeyIncludes } from "./queryKeys";

type TrackGroupQueryOptions = {
  skip?: number;
  take?: number;
  orderBy?: "random";
  tag?: string;
  title?: string;
  distinctArtists?: boolean;
  isReleased?: "released" | "not-released";
};

const fetchTrackGroups: QueryFunction<
  { results: TrackGroup[]; total?: number },
  ["fetchTrackGroups", TrackGroupQueryOptions, ...any]
> = ({
  queryKey: [
    _,
    { skip, take, orderBy, title, tag, distinctArtists, isReleased },
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

  params.append("distinctArtists", String(distinctArtists ?? false));
  return api.get(`v1/trackGroups?${params}`, { signal });
};

export function queryTrackGroups(opts: TrackGroupQueryOptions) {
  return queryOptions({
    queryKey: ["fetchTrackGroups", opts, QUERY_KEY_TRACK_GROUPS],
    queryFn: fetchTrackGroups,
  });
}

const fetchTopSoldTrackGroups: QueryFunction<
  { results: TrackGroup[]; total?: number },
  [
    "fetchTopSoldTrackGroups",
    Pick<TrackGroupQueryOptions, "skip" | "take">,
    ...any,
  ]
> = ({ queryKey: [_, { skip, take }], signal }) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));

  return api.get(`v1/trackGroups/topSold?${params}`, { signal });
};

export function queryTopSoldTrackGroups(opts: TrackGroupQueryOptions) {
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
