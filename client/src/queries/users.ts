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
  ["fetchManagedArtist", { userId: number; artistId: number }]
> = ({ queryKey: [_, { userId, artistId }], signal }) => {
  return api
    .get<{
      result: Artist;
    }>(`v1/users/${userId}/artists/${artistId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedArtist(userId: number, artistId: number) {
  return queryOptions({
    queryKey: ["fetchManagedArtist", { userId, artistId }],
    queryFn: fetchManagedArtist,
    enabled: isFinite(userId) && isFinite(artistId),
  });
}

export type CreateArtistBody = Partial<
  Pick<Artist, "bio" | "name" | "urlSlug" | "properties">
>;

async function createArtist({
  userId,
  body,
}: {
  userId: number;
  body: CreateArtistBody;
}) {
  return api
    .post<
      CreateArtistBody,
      { result: Artist }
    >(`v1/users/${userId}/artists`, body)
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
  Pick<Artist, "bio" | "name" | "location" | "links" | "urlSlug" | "properties">
>;

async function updateArtist({
  userId,
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
    >(`v1/users/${userId}/artists/${artistId}`, body)
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
  userId,
  artistId,
}: {
  userId: number;
  artistId: number;
  artistSlug: string;
}) {
  return api.del(`v1/users/${userId}/artists/${artistId}`);
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
