import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_TRACK_GROUPS } from "./queryKeys";

const fetchArtist: QueryFunction<
  Artist,
  ["fetchArtist", { artistSlug: string; includeDefaultTier?: boolean }]
> = ({ queryKey: [_, { artistSlug, includeDefaultTier }], signal }) => {
  return api
    .get<{
      result: Artist;
    }>(`v1/artists/${artistSlug}?includeDefaultTier=${includeDefaultTier}`, {
      signal,
    })
    .then((r) => r.result);
};

export function queryArtist(opts: {
  artistSlug: string;
  includeDefaultTier?: boolean;
}) {
  return queryOptions({
    queryKey: [
      "fetchArtist",
      {
        artistSlug: opts.artistSlug,
        includeDefaultTier: opts.includeDefaultTier,
      },
    ],
    queryFn: fetchArtist,
    enabled: !!opts.artistSlug,
  });
}

const fetchManagedArtistTrackGroups: QueryFunction<
  { results: TrackGroup[] },
  ["fetchUserTrackGroups", { artistId?: number }, ...any]
> = ({ queryKey: [_, { artistId }], signal }) => {
  return api.get(`v1/manage/artists/${artistId}/trackGroups`, { signal });
};

export function queryManagedArtistTrackGroups(opts: { artistId?: number }) {
  return queryOptions({
    queryKey: ["fetchUserTrackGroups", opts, QUERY_KEY_TRACK_GROUPS],
    queryFn: fetchManagedArtistTrackGroups,
  });
}

const fetchManagedArtistSubscriptionTiers: QueryFunction<
  { results: ArtistSubscriptionTier[] },
  [
    "fetchManagedArtistSubscriptionTiers",
    { artistId?: number; includeDefault?: boolean },
    ...any,
  ]
> = ({ queryKey: [_, { artistId, includeDefault }], signal }) => {
  return api.get(
    `v1/manage/artists/${artistId}/subscriptionTiers?${includeDefault ? "includeDefault=true" : ""}`,
    { signal }
  );
};

export function queryManagedArtistSubscriptionTiers(opts: {
  artistId?: number;
  includeDefault?: boolean;
}) {
  return queryOptions({
    queryKey: [
      "fetchManagedArtistSubscriptionTiers",
      opts,
      QUERY_KEY_TRACK_GROUPS,
    ],
    queryFn: fetchManagedArtistSubscriptionTiers,
  });
}
