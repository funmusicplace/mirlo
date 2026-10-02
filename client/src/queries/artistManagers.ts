import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import {
  QUERY_KEY_ARTIST_MANAGERS,
  QUERY_KEY_ARTISTS,
  QUERY_KEY_AUTH,
  queryKeyIncludes,
} from "./queryKeys";

export type ArtistManager = {
  profileId: number;
  userId: number;
  acceptedAt: string | null;
  createdAt: string;
  user: { id: number; name: string | null; email?: string };
  invitedBy: { id: number; name: string | null };
};

export type ArtistManagerInvite = {
  profileId: number;
  createdAt: string;
  artist: Pick<Artist, "id" | "name" | "urlSlug" | "avatar">;
  invitedBy: { id: number; name: string | null };
};

const fetchArtistManagers: QueryFunction<
  ArtistManager[],
  ["fetchArtistManagers", { artistId: number }, ...any]
> = ({ queryKey: [_, { artistId }], signal }) =>
  api
    .get<{
      results: ArtistManager[];
    }>(`v1/manage/artists/${artistId}/managers`, { signal })
    .then((r) => r.results);

export function queryArtistManagers(artistId: number) {
  return queryOptions({
    queryKey: ["fetchArtistManagers", { artistId }, QUERY_KEY_ARTIST_MANAGERS],
    queryFn: fetchArtistManagers,
    enabled: isFinite(artistId),
  });
}

const fetchArtistInvites: QueryFunction<
  ArtistManagerInvite[],
  ["fetchArtistInvites", ...any]
> = ({ signal }) =>
  api
    .get<{
      results: ArtistManagerInvite[];
    }>(`v1/manage/artistInvites`, { signal })
    .then((r) => r.results);

export function queryArtistInvites() {
  return queryOptions({
    queryKey: ["fetchArtistInvites", QUERY_KEY_ARTIST_MANAGERS],
    queryFn: fetchArtistInvites,
  });
}

// The logged in user's editable artists live on the auth profile, so accepting
// or leaving needs to refresh that too.
const useInvalidateManagers = () => {
  const client = useQueryClient();
  return () =>
    client.invalidateQueries({
      predicate: (query) =>
        queryKeyIncludes(query, QUERY_KEY_ARTIST_MANAGERS) ||
        queryKeyIncludes(query, QUERY_KEY_ARTISTS) ||
        queryKeyIncludes(query, QUERY_KEY_AUTH),
    });
};

export function useInviteArtistManagerMutation() {
  const invalidate = useInvalidateManagers();
  return useMutation({
    mutationFn: ({ artistId, email }: { artistId: number; email: string }) =>
      api.post<{ email: string }, { results: ArtistManager[] }>(
        `v1/manage/artists/${artistId}/managers`,
        { email }
      ),
    onSuccess: invalidate,
  });
}

export function useRemoveArtistManagerMutation() {
  const invalidate = useInvalidateManagers();
  return useMutation({
    mutationFn: ({ artistId, userId }: { artistId: number; userId: number }) =>
      api.del(`v1/manage/artists/${artistId}/managers/${userId}`),
    onSuccess: invalidate,
  });
}

export function useAcceptArtistInviteMutation() {
  const invalidate = useInvalidateManagers();
  return useMutation({
    mutationFn: ({ artistId }: { artistId: number }) =>
      api.put<{}, unknown>(`v1/manage/artistInvites/${artistId}`, {}),
    onSuccess: invalidate,
  });
}

/** Declines a pending invite, or gives up manage access already accepted. */
export function useLeaveArtistMutation() {
  const invalidate = useInvalidateManagers();
  return useMutation({
    mutationFn: ({ artistId }: { artistId: number }) =>
      api.del(`v1/manage/artistInvites/${artistId}`),
    onSuccess: invalidate,
  });
}
