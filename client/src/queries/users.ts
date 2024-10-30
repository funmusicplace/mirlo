import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import {
  QUERY_KEY_ARTISTS,
  queryKeyIncludes,
  queryKeyMatches,
} from "./queryKeys";

const fetchUserStripeStatus: QueryFunction<
  AccountStatus,
  ["fetchUserStripeStatus", { userId: number }]
> = ({ queryKey: [_, { userId }], signal }) => {
  return api
    .get<{
      result: AccountStatus;
    }>(`v1/users/${userId}/stripe/checkAccountStatus`, { signal })
    .then((r) => r.result);
};

export function queryUserStripeStatus(userId: number) {
  return queryOptions({
    queryKey: ["fetchUserStripeStatus", { userId }],
    queryFn: fetchUserStripeStatus,
    enabled: isFinite(userId),
  });
}

const fetchManagedArtist: QueryFunction<
  Artist,
  ["fetchManagedArtist", { artistId: number }]
> = ({ queryKey: [_, { artistId }], signal }) => {
  return api
    .get<{
      result: Artist;
    }>(`v1/manage/artists/${artistId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedArtist(artistId: number) {
  return queryOptions({
    queryKey: ["fetchManagedArtist", { artistId }],
    queryFn: fetchManagedArtist,
    enabled: isFinite(artistId),
  });
}

const fetchManagedTrackGroup: QueryFunction<
  TrackGroup,
  ["fetchManagedTrackGroup", { trackGroupId: number }]
> = ({ queryKey: [_, { trackGroupId }], signal }) => {
  return api
    .get<{
      result: TrackGroup;
    }>(`v1/manage/trackGroups/${trackGroupId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedTrackGroup(trackGroupId: number) {
  return queryOptions({
    queryKey: ["fetchManagedTrackGroup", { trackGroupId }],
    queryFn: fetchManagedTrackGroup,
    enabled: isFinite(trackGroupId),
  });
}

const fetchManagedMerch: QueryFunction<
  Merch,
  ["fetchManagedMerch", { merchId: string }]
> = ({ queryKey: [_, { merchId }], signal }) => {
  return api
    .get<{
      result: Merch;
    }>(`v1/manage/merch/${merchId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedMerch(merchId: string) {
  return queryOptions({
    queryKey: ["fetchManagedMerch", { merchId }],
    queryFn: fetchManagedMerch,
  });
}

export type CreateArtistBody = Partial<
  Pick<Artist, "bio" | "name" | "urlSlug" | "properties">
>;

async function createArtist({
  body,
}: {
  userId: number;
  body: CreateArtistBody;
}) {
  return api
    .post<CreateArtistBody, { result: Artist }>(`v1/manage/artists`, body)
    .then((r) => r.result);
}

export function useCreateArtistMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createArtist,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_ARTISTS),
      });
    },
  });
}

export type UpdateArtistBody = Partial<
  Pick<
    Artist,
    | "bio"
    | "name"
    | "location"
    | "links"
    | "linksJson"
    | "urlSlug"
    | "properties"
  >
>;

async function updateArtist({
  artistId,
  body,
}: {
  userId: number;
  artistId: number;
  body: UpdateArtistBody;
}) {
  return api
    .put<
      UpdateArtistBody,
      { result: Artist }
    >(`v1/manage/artists/${artistId}`, body)
    .then((r) => r.result);
}

export function useUpdateArtistMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateArtist,
    async onSuccess(data, { artistId }) {
      await client.invalidateQueries({
        predicate: (query) => {
          const invalidate =
            queryKeyMatches(query, { artistId }) ||
            queryKeyMatches(query, { artistSlug: String(data.urlSlug) }) ||
            query.queryKey.includes(QUERY_KEY_ARTISTS);
          return invalidate;
        },
      });
    },
  });
}

async function deleteArtist({
  artistId,
}: {
  artistId: number;
  artistSlug: string;
}) {
  return api.del(`v1/manage/artists/${artistId}`);
}

export function useDeleteArtistMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteArtist,
    async onSuccess(_, { artistId, artistSlug }) {
      await client.invalidateQueries({
        predicate: (query) =>
          queryKeyMatches(query, { artistId }) ||
          queryKeyMatches(query, { artistSlug }) ||
          queryKeyIncludes(query, QUERY_KEY_ARTISTS),
      });
    },
  });
}
