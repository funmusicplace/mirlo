import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_ARTISTS } from "./queryKeys";

const fetchLocationTags: QueryFunction<LocationTag[], [string, string]> = ({
  queryKey: [_, query],
  signal,
}) => {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("query", query.trim());
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `v1/locationTags?${queryString}`
    : "v1/locationTags";

  return api.get<LocationTag[]>(endpoint, { signal });
};

export function queryLocationTags(searchQuery: string = "") {
  return queryOptions({
    queryKey: ["locationTags", searchQuery],
    queryFn: fetchLocationTags,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

const fetchArtistLocationTags: QueryFunction<
  LocationTag[],
  ["artistLocationTags", number]
> = ({ queryKey: [_, artistId], signal }) => {
  return api.get<LocationTag[]>(`v1/manage/artists/${artistId}/locationTags`, {
    signal,
  });
};

export function queryArtistLocationTags(artistId: number) {
  return queryOptions({
    queryKey: ["artistLocationTags", artistId],
    queryFn: fetchArtistLocationTags,
    enabled: !!artistId,
  });
}

export function useAddLocationTag() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artistId,
      locationTagId,
    }: {
      artistId: number;
      locationTagId: number;
    }) => {
      return api.post<{ locationTagId: number }, LocationTag>(
        `v1/manage/artists/${artistId}/locationTags`,
        { locationTagId }
      );
    },
    async onSuccess(data, { artistId }) {
      client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_ARTISTS),
      });
    },
  });
}

export function useRemoveLocationTag() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artistId,
      locationTagId,
    }: {
      artistId: number;
      locationTagId: number;
    }) => {
      const url = `v1/manage/artists/${artistId}/locationTags/${locationTagId}`;
      const response = await api.del(url);
      return response;
    },
    async onSuccess(data, { artistId }) {
      client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_ARTISTS),
      });
    },
  });
}
