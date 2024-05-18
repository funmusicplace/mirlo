import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_TRACK_GROUPS, queryKeyIncludes } from "./queryKeys";

const fetchTrackGroups: QueryFunction<
  { results: TrackGroup[]; total?: number },
  [
    "fetchTrackGroups",
    { take: number; orderBy: "random"; distinctArtists?: boolean },
    ...any,
  ]
> = ({ queryKey: [_, { take, orderBy, distinctArtists }], signal }) => {
  return api.get(
    `v1/trackGroups?take=${take}&orderBy=${orderBy}&=distinctArtists=${distinctArtists ?? false}`,
    { signal }
  );
};

export function queryTrackGroups(opts: {
  take: number;
  orderBy: "random";
  distinctArtists?: boolean;
}) {
  return queryOptions({
    queryKey: ["fetchTrackGroups", opts, QUERY_KEY_TRACK_GROUPS],
    queryFn: fetchTrackGroups,
  });
}

const fetchUserTrackGroups: QueryFunction<
  { results: TrackGroup[] },
  ["fetchUserTrackGroups", { userId: number; artistId?: number }, ...any]
> = ({ queryKey: [_, { userId, artistId }], signal }) => {
  return api.get(
    `v1/users/${userId}/trackGroups` +
      (artistId ? `?artistId=${artistId}` : ""),
    { signal }
  );
};

export function queryUserTrackGroups(opts: {
  userId: number;
  artistId?: number;
}) {
  return queryOptions({
    queryKey: ["fetchUserTrackGroups", opts, QUERY_KEY_TRACK_GROUPS],
    queryFn: fetchUserTrackGroups,
    enabled: !!opts.userId && (opts.artistId === undefined || !!opts.artistId),
  });
}

async function createTrackGroup(opts: {
  userId: number;
  trackGroup: Partial<TrackGroup>;
}): Promise<{ result: TrackGroup }> {
  return await api.post(`v1/users/${opts.userId}/trackGroups`, opts.trackGroup);
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
  userId: number;
  trackGroupId: number;
  trackGroup: Partial<TrackGroup>;
}) {
  await api.put(
    `v1/users/${opts.userId}/trackGroups/${opts.trackGroupId}`,
    opts.trackGroup
  );
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
  await api.del(`v1/users/${opts.userId}/trackGroups/${opts.trackGroupId}`);
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
