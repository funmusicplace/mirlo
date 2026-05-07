import { useQuery } from "@tanstack/react-query";
import api from "services/api";

export const useTracksQuery = (trackIds: number[]) => {
  return useQuery({
    queryKey: ["tracks", trackIds],
    queryFn: async () => {
      if (trackIds.length === 0) return [];
      const results = await Promise.all(
        trackIds.map((id) => api.get<Track>(`tracks/${id}`))
      );
      return results.map((r) => r.result);
    },
    enabled: trackIds.length > 0,
  });
};
