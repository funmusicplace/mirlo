import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import {
  QUERY_KEY_ARTISTS,
  QUERY_KEY_MERCH,
  QUERY_KEY_SALES,
  QUERY_KEY_TRACK_GROUPS,
} from "./queryKeys";

const fetchArtist: QueryFunction<
  Artist,
  ["fetchArtist", { artistSlug?: string; includeDefaultTier?: boolean }]
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
  artistSlug?: string;
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

const fetchManagedArtists: QueryFunction<
  { results: Artist[] },
  ["fetchManagedArtists", {}, ...any]
> = ({ queryKey: [_], signal }) => {
  return api.get(`v1/manage/artists`, { signal });
};

export function queryManagedArtists(opts?: {}) {
  return queryOptions({
    queryKey: ["fetchManagedArtists", opts ?? {}, QUERY_KEY_ARTISTS],
    queryFn: fetchManagedArtists,
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

const fetchManagedArtistMerch: QueryFunction<
  { results: Merch[] },
  ["fetchUserMerch", { artistId?: number }, ...any]
> = ({ queryKey: [_, { artistId }], signal }) => {
  return api.get(`v1/manage/artists/${artistId}/merch`, { signal });
};

export function queryManagedArtistMerch(opts: { artistId?: number }) {
  return queryOptions({
    queryKey: ["fetchUserMerch", opts, QUERY_KEY_MERCH],
    queryFn: fetchManagedArtistMerch,
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

const fetchArtistSupporters: QueryFunction<
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
    "fetchArtistSupporters",
    opts: {
      artistId: number;
      take?: number;
      skip?: number;
      trackGroupIds?: number[];
    },
    ...any,
  ]
> = ({ queryKey: [_, opts], signal }) => {
  const { artistId } = opts;
  const params = new URLSearchParams();

  if (opts.trackGroupIds) {
    opts.trackGroupIds.forEach((id) => {
      if (isFinite(id)) {
        params.append("trackGroupIds", String(id));
      }
    });
  }

  if (opts.take) {
    params.append("take", String(opts.take));
  }
  if (opts.skip) {
    params.append("skip", String(opts.skip));
  }
  return api.get(`v1/artists/${artistId}/supporters/?${params.toString()}`, {
    signal,
  });
};

export function queryArtistSupporters(opts: {
  artistId: number;
  take?: number;
  skip?: number;
  trackGroupIds?: number[];
}) {
  return queryOptions({
    queryKey: ["fetchArtistSupporters", opts, QUERY_KEY_SALES],
    queryFn: fetchArtistSupporters,
  });
}

export type ArtistQueryOptions = {
  skip?: number;
  take?: number;
  orderBy?: "random";
  name?: string;
  isLabel?: boolean;
};

const fetchArtists: QueryFunction<
  { results: Artist[]; total?: number },
  ["fetchArtists", ArtistQueryOptions, ...any]
> = ({ queryKey: [_, { skip, take, orderBy, name, isLabel }], signal }) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (orderBy) params.append("orderBy", orderBy);
  if (name) params.append("name", name);
  if (isLabel) params.append("isLabel", String(isLabel));

  return api.get(`v1/artists?${params}`, { signal });
};

export function queryArtists(opts: ArtistQueryOptions) {
  return queryOptions({
    queryKey: ["fetchArtists", opts, QUERY_KEY_ARTISTS],
    queryFn: fetchArtists,
  });
}
