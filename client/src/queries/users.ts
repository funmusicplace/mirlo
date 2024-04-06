import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_ARTISTS } from "./keys";
import { isMatch } from "lodash";

const fetchUserStripeStatus: QueryFunction<
  AccountStatus,
  [{ query: "fetchUserStripeStatus"; userId: number }]
> = ({ queryKey: [{ userId }], signal }) => {
  return api
    .Get<{
      result: AccountStatus;
    }>(`v1/users/${userId}/stripe/checkAccountStatus`, { signal })
    .then((r) => r.result);
};

export function queryUserStripeStatus(userId: number) {
  return queryOptions({
    queryKey: [{ query: "fetchUserStripeStatus", userId }],
    queryFn: fetchUserStripeStatus,
    enabled: isFinite(userId),
  });
}

const fetchManagedArtist: QueryFunction<
  Artist,
  [
    { query: "fetchManagedArtist"; userId: number; artistId: number },
    ...unknown[],
  ]
> = ({ queryKey: [{ userId, artistId }], signal }) => {
  return api
    .Get<{
      result: Artist;
    }>(`v1/users/${userId}/artists/${artistId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedArtist(userId: number, artistId: number) {
  return queryOptions({
    queryKey: [{ query: "fetchManagedArtist", userId, artistId }],
    queryFn: fetchManagedArtist,
    enabled: isFinite(userId) && isFinite(artistId),
  });
}

type ArtistBody = Partial<
  Pick<Artist, "bio" | "name" | "urlSlug" | "properties">
>;

async function createArtist({
  userId,
  body,
}: {
  userId: number;
  body: ArtistBody;
}) {
  return api
    .Post<ArtistBody, { result: Artist }>(`v1/users/${userId}/artists`, body)
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

async function updateArtist({
  userId,
  artistId,
  body,
}: {
  userId: number;
  artistId: number;
  body: ArtistBody;
}) {
  return api
    .Put<
      ArtistBody,
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
        predicate: (query) =>
          isMatch(Object(query.queryKey[0]), { artistId }) ||
          isMatch(Object(query.queryKey[0]), {
            artistSlug: String(data.urlSlug),
          }) ||
          query.queryKey.includes(QUERY_KEY_ARTISTS),
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
  return api.Delete(`v1/users/${userId}/artists/${artistId}`);
}

export function useDeleteArtistMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteArtist,
    async onSuccess(_, { artistId, artistSlug }) {
      await client.invalidateQueries({
        predicate: (query) =>
          isMatch(Object(query.queryKey[0]), { artistId }) ||
          isMatch(Object(query.queryKey[0]), { artistSlug }) ||
          query.queryKey.includes(QUERY_KEY_ARTISTS),
      });
    },
  });
}
