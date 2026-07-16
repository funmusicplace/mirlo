import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "services/api";

const QUERY_KEY_ADMIN_FUNDRAISER_PLEDGES = "admin-fundraiser-pledges";
const QUERY_KEY_ADMIN_CLIENTS = "admin-clients";

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

export interface AdminClient {
  id: number;
  applicationName: string;
  applicationUrl: string;
  allowedCorsOrigins: string[];
  key: string | null;
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
