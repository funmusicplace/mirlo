import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import { MirloFetchError } from "./fetch/MirloFetchError";
import {
  QUERY_KEY_ARTISTS,
  QUERY_KEY_AUTH,
  QUERY_KEY_MERCH,
  QUERY_KEY_PURCHASES,
  QUERY_KEY_SALES,
  queryKeyIncludes,
  queryKeyMatches,
} from "./queryKeys";

const fetchUserStripeStatus: QueryFunction<
  AccountStatus,
  ["fetchUserStripeStatus", { userId?: number }]
> = ({ queryKey: [_, { userId }], signal }) => {
  return api
    .get<{
      result: AccountStatus;
    }>(`v1/users/${userId}/stripe/checkAccountStatus`, { signal })
    .then((r) => r.result);
};

export function queryUserStripeStatus(userId?: number) {
  return queryOptions({
    queryKey: ["fetchUserStripeStatus", { userId }],
    queryFn: fetchUserStripeStatus,
    enabled: !!userId && isFinite(userId),
    retry: (failureCount, err) => {
      const shouldRetry =
        !(err instanceof MirloFetchError && err.status === 403) &&
        failureCount < 1;

      return shouldRetry;
    },
    refetchOnWindowFocus: (query) =>
      !(
        query.state.error instanceof MirloFetchError &&
        query.state.error.status === 403
      ),
    retryOnMount: false,
  });
}

const fetchManagedArtist: QueryFunction<
  Artist,
  ["fetchManagedArtist", { artistId: number }, ...any]
> = ({ queryKey: [_, { artistId }], signal }) => {
  return api
    .get<{
      result: Artist;
    }>(`v1/manage/artists/${artistId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedArtist(artistId: number) {
  return queryOptions({
    queryKey: ["fetchManagedArtist", { artistId }, QUERY_KEY_ARTISTS],
    queryFn: fetchManagedArtist,
    enabled: isFinite(artistId) && artistId > 0,
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
  ["fetchManagedMerch", { merchId: string }, ...any]
> = ({ queryKey: [_, { merchId }], signal }) => {
  return api
    .get<{
      result: Merch;
    }>(`v1/manage/merch/${merchId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedMerch(merchId: string) {
  return queryOptions({
    queryKey: ["fetchManagedMerch", { merchId }, QUERY_KEY_MERCH],
    queryFn: fetchManagedMerch,
    enabled: !!merchId,
  });
}

const fetchUserPurchases: QueryFunction<
  { results: MerchPurchase[]; total: number },
  [
    "fetchUserMerchPurchases",
    opts: {
      artistIds?: number[];
      take?: number;
      skip?: number;
      datePurchased?: string;
    },
    ...any,
  ]
> = ({ queryKey: [_, opts], signal }) => {
  const params = new URLSearchParams();
  if (opts.artistIds?.length) {
    params.append("artistIds", opts.artistIds.join(","));
  }
  if (opts.take) {
    params.append("take", String(opts.take));
  }
  if (opts.skip) {
    params.append("skip", String(opts.skip));
  }
  if (opts.datePurchased) {
    params.append("datePurchased", opts.datePurchased);
  }
  const queryString = params.toString();
  return api.get(
    `v1/manage/purchases/${queryString ? "?" + queryString : ""}`,
    { signal }
  );
};

export function queryUserPurchases(
  opts: {
    artistIds?: number[];
    take?: number;
    skip?: number;
    datePurchased?: string;
  } = {}
) {
  return queryOptions({
    queryKey: ["fetchUserMerchPurchases", opts, QUERY_KEY_PURCHASES],
    queryFn: fetchUserPurchases,
  });
}

async function updatePurchase(opts: {
  purchaseId: string;
  purchase: { fulfillmentStatus: string };
}) {
  await api.put(`v1/manage/purchases/${opts.purchaseId}`, opts.purchase);
}

export function useUpdatePurchaseMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updatePurchase,
    onSuccess() {
      client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_PURCHASES),
      });
    },
  });
}

type ProfileChangeBody = {
  userId: number;
  password?: string;
  newEmail?: string;
  language: string;
  isLabelAccount: boolean;
  combineSubscriptionEmails?: boolean;
};

async function updateProfile(body: ProfileChangeBody) {
  await api.put(`v1/users/${body.userId}`, body);
}

export function useProfileMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess() {
      client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_AUTH),
      });
    },
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
    | "tourDates"
  >
> & {
  displayLabelUserId?: number | null;
};

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
          queryKeyIncludes(query, QUERY_KEY_ARTISTS) ||
          query.queryKey.includes("fetchArtist"),
      });
    },
  });
}

export type Sale = {
  amount: number;
  artist: (Partial<Artist> & { id: number; urlSlug: string })[];
  currency: string;
  datePurchased: string;
  paymentProcessorCut: number;
  platformCut: number;
  shippingFeeAmount?: number;
  userFriendlyId?: string | null;
  trackGroupPurchases?: {
    message: string;
    trackGroupId: number;
    trackGroup: TrackGroup;
  }[];
  trackPurchases?: {
    message: string;
    trackId: number;
    track: Track;
  }[];
  merchPurchases?: {
    message: string;
    merchId: number;
    merch: Merch;
  }[];
  shippingAddress?: { country: string };
  quantity?: number;
  artistUserSubscriptionCharges?: Partial<ArtistUserSubscriptionCharge>[];
};

const fetchUserSales: QueryFunction<
  {
    results: Sale[];
    total: number;
    totalAmount: number;
    totalSupporters: number;
  },
  [
    "fetchUserSales",
    opts: {
      artistIds?: number[];
      take?: number;
      skip?: number;
      datePurchased?: string;
    },
    ...any,
  ]
> = ({ queryKey: [_, opts], signal }) => {
  const { artistIds, datePurchased } = opts;
  const params = new URLSearchParams();
  if (artistIds) {
    artistIds.forEach((id) => {
      if (isFinite(id)) {
        params.append("artistIds", String(id));
      }
    });
  }
  if (opts.take) {
    params.append("take", String(opts.take));
  }
  if (opts.skip) {
    params.append("skip", String(opts.skip));
  }
  if (datePurchased) {
    params.append("datePurchased", datePurchased);
  }
  return api.get(`v1/manage/sales/?${params.toString()}`, { signal });
};

export function queryUserSales(
  opts: {
    artistIds?: number[];
    take?: number;
    skip?: number;
    trackGroupIds?: number[];
    datePurchased?: string;
  } = {}
) {
  return queryOptions({
    queryKey: ["fetchUserSales", opts, QUERY_KEY_SALES],
    queryFn: fetchUserSales,
  });
}

type UserPurchase = UserTrackGroupPurchase | UserTrackPurchase;

const fetchUserCollection: QueryFunction<
  UserPurchase[],
  ["fetchUserCollection", { userId?: number }, ...any]
> = ({ queryKey: [_, { userId }], signal }) => {
  return api
    .get<{ results: UserPurchase[] }>(`v1/users/${userId}/collection`, {
      signal,
    })
    .then((r) => r.results);
};

export function queryUserCollection(userId?: number) {
  return queryOptions({
    queryKey: ["fetchUserCollection", { userId }, QUERY_KEY_AUTH],
    queryFn: fetchUserCollection,
    enabled: !!userId,
  });
}

const fetchUserWishlistTrackGroups: QueryFunction<
  UserTrackGroupWishlist[],
  ["fetchUserWishlistTrackGroups", { userId?: number }, ...any]
> = ({ queryKey: [_, { userId }], signal }) => {
  return api
    .get<{
      results: UserTrackGroupWishlist[];
    }>(`v1/users/${userId}/wishlist`, { signal })
    .then((r) => r.results);
};

export function queryUserWishlistTrackGroups(userId?: number) {
  return queryOptions({
    queryKey: ["fetchUserWishlistTrackGroups", { userId }, QUERY_KEY_AUTH],
    queryFn: fetchUserWishlistTrackGroups,
    enabled: !!userId,
  });
}
