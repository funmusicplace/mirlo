import { useQuery } from "@tanstack/react-query";
import api from "services/api";

const QUERY_KEY_ADMIN_FUNDRAISER_PLEDGES = "admin-fundraiser-pledges";

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
