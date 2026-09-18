import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import api from "services/api";

const QUERY_KEY_ADMIN_FUNDRAISER_PLEDGES = "admin-fundraiser-pledges";
const QUERY_KEY_ADMIN_CLIENTS = "admin-clients";
const QUERY_KEY_ADMIN_STATS = "admin-stats";
const QUERY_KEY_ADMIN_ARTIST = "admin-artist";
const QUERY_KEY_ADMIN_CONTENT_FLAGS = "admin-content-flags";

/** Bucket size for the admin dashboard's time series. */
export type StatsGranularity = "week" | "month";

export interface StatsCountPoint {
  date: string;
  count: number;
}

export interface StatsRevenuePoint {
  date: string;
  purchasesUsdCents: number;
  subscriptionsUsdCents: number;
  purchasesConvertedUsdCents: number;
  subscriptionsConvertedUsdCents: number;
  platformCutUsdCents: number;
  platformCutConvertedUsdCents: number;
}

export interface AdminStats {
  granularity: StatsGranularity;
  userSignups: StatsCountPoint[];
  artistSignups: StatsCountPoint[];
  revenue: StatsRevenuePoint[];
  transactionCounts: Array<{ date: string; currency: string; count: number }>;
  avgMonthlyPlays: number;
  avgMonthlyActiveUsers: number;
  avgMonthlyAlbumDownloads: number;
}

export const useAdminStatsQuery = (
  granularity: StatsGranularity,
  days: number
) => {
  return useQuery({
    queryKey: [QUERY_KEY_ADMIN_STATS, granularity, days],
    queryFn: async () => {
      const { result } = await api.get<AdminStats>(
        `admin/stats?days=${days}&granularity=${granularity}`
      );
      return result;
    },
    // Toggling week/month swaps the query key; keep the old charts on screen
    // instead of blanking the page while the new ones load.
    placeholderData: keepPreviousData,
  });
};

export interface FundraiserPledgesFilters {
  pledgeStatus?: string;
  search?: string;
}

export const useFundraiserPledgesQuery = (
  filters: FundraiserPledgesFilters,
  page: number = 1,
  pageSize: number = 20
) => {
  return useQuery({
    queryKey: [QUERY_KEY_ADMIN_FUNDRAISER_PLEDGES, filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });

      params.append("page", String(page));
      params.append("limit", String(pageSize));

      return api.getMany<FundraiserPledge>(`admin/fundraiserPledges?${params}`);
    },
  });
};

export type AdminClientStatus = "pending" | "approved" | "revoked";

export interface AdminClient {
  id: number;
  applicationName: string;
  applicationUrl: string;
  allowedCorsOrigins: string[];
  key: string | null;
  status: AdminClientStatus;
  user: { id: number; email: string } | null;
  createdAt: string;
}

export const useAdminClientsQuery = () => {
  return useQuery({
    queryKey: [QUERY_KEY_ADMIN_CLIENTS],
    queryFn: async () => api.getMany<AdminClient>("admin/clients"),
  });
};

async function createAdminClient(data: {
  applicationName: string;
  applicationUrl: string;
  allowedCorsOrigins: string[];
  userEmail?: string;
}) {
  return api.post<typeof data, { result: AdminClient }>("admin/clients", data);
}

export const useCreateAdminClientMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createAdminClient,
    async onSuccess() {
      await client.invalidateQueries({ queryKey: [QUERY_KEY_ADMIN_CLIENTS] });
    },
  });
};

async function rotateAdminClientKey(opts: { clientId: number }) {
  return api.put<{ rotateKey: boolean }, { result: AdminClient }>(
    `admin/clients/${opts.clientId}`,
    { rotateKey: true }
  );
}

export const useRotateAdminClientKeyMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: rotateAdminClientKey,
    async onSuccess() {
      await client.invalidateQueries({ queryKey: [QUERY_KEY_ADMIN_CLIENTS] });
    },
  });
};

async function updateAdminClient(opts: {
  clientId: number;
  status?: AdminClientStatus;
  userEmail?: string | null;
}) {
  const { clientId, ...data } = opts;
  return api.put<typeof data, { result: AdminClient }>(
    `admin/clients/${clientId}`,
    data
  );
}

export const useUpdateAdminClientMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateAdminClient,
    async onSuccess() {
      await client.invalidateQueries({ queryKey: [QUERY_KEY_ADMIN_CLIENTS] });
    },
  });
};

async function deleteAdminClient(opts: { clientId: number }) {
  return api.delete(`admin/clients/${opts.clientId}`);
}

export const useDeleteAdminClientMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminClient,
    async onSuccess() {
      await client.invalidateQueries({ queryKey: [QUERY_KEY_ADMIN_CLIENTS] });
    },
  });
};

export type AdminContentFlagSource = "USER_REPORT" | "SIGHTENGINE";

export interface AdminContentFlag {
  id: number;
  createdAt: string;
  source: AdminContentFlagSource;
  reason: string | null;
  description: string | null;
  reporterEmail: string | null;
  imageModel: string | null;
  imageId: string | null;
  score: number | null;
  artistId: number | null;
  artist: {
    id: number;
    name: string;
    urlSlug: string;
    enabled: boolean;
  } | null;
  trackGroupId: number | null;
  trackGroup: {
    id: number;
    title: string | null;
    urlSlug: string;
    adminEnabled: boolean;
    hideFromSearch: boolean;
  } | null;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  resolvedByUser: { id: number; name: string | null; email: string } | null;
}

export type AdminContentFlagsResolvedFilter = "unresolved" | "resolved" | "all";

export const useAdminContentFlagsQuery = (
  resolvedFilter: AdminContentFlagsResolvedFilter,
  page: number,
  pageSize: number
) => {
  return useQuery({
    queryKey: [QUERY_KEY_ADMIN_CONTENT_FLAGS, resolvedFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (resolvedFilter !== "all") {
        params.append("resolved", String(resolvedFilter === "resolved"));
      }
      params.append("skip", String(page * pageSize));
      params.append("take", String(pageSize));
      return api.getMany<AdminContentFlag>(`admin/contentFlags?${params}`);
    },
    placeholderData: keepPreviousData,
  });
};

export const useAdminUnresolvedContentFlagsCountQuery = () => {
  return useQuery({
    queryKey: [QUERY_KEY_ADMIN_CONTENT_FLAGS, "unresolvedCount"],
    queryFn: async () => {
      const { result } = await api.get<number>(
        "admin/contentFlags/unresolvedCount"
      );
      return result;
    },
  });
};

async function updateAdminContentFlag(opts: {
  flagId: number;
  resolved: boolean;
}) {
  const { flagId, ...data } = opts;
  return api.put<typeof data, { result: AdminContentFlag }>(
    `admin/contentFlags/${flagId}`,
    data
  );
}

export const useUpdateAdminContentFlagMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateAdminContentFlag,
    async onSuccess() {
      await client.invalidateQueries({
        queryKey: [QUERY_KEY_ADMIN_CONTENT_FLAGS],
      });
    },
  });
};

async function updateAdminTrackGroup(opts: {
  trackGroupId: number;
  adminEnabled: boolean;
  hideFromSearch: boolean;
}) {
  const { trackGroupId, ...data } = opts;
  return api.put<typeof data, { message: string }>(
    `admin/trackGroups/${trackGroupId}`,
    data
  );
}

export const useUpdateAdminTrackGroupMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateAdminTrackGroup,
    async onSuccess() {
      await client.invalidateQueries({
        queryKey: [QUERY_KEY_ADMIN_CONTENT_FLAGS],
      });
    },
  });
};

export const useAdminArtistQuery = (artistId: string | undefined) => {
  return useQuery({
    queryKey: [QUERY_KEY_ADMIN_ARTIST, artistId],
    queryFn: async () => {
      const { result } = await api.get<ArtistFromAdmin>(
        `admin/artists/${artistId}`
      );
      return result;
    },
    enabled: !!artistId,
  });
};

async function updateAdminArtist(opts: {
  artistId: number;
  enabled: boolean;
  disableReason?: string;
}) {
  const { artistId, ...data } = opts;
  return api.put<typeof data, { message: string }>(
    `admin/artists/${artistId}`,
    data
  );
}

export const useUpdateAdminArtistMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateAdminArtist,
    async onSuccess(_data, { artistId }) {
      await Promise.all([
        client.invalidateQueries({
          queryKey: [QUERY_KEY_ADMIN_ARTIST, String(artistId)],
        }),
        client.invalidateQueries({
          queryKey: [QUERY_KEY_ADMIN_CONTENT_FLAGS],
        }),
      ]);
    },
  });
};
