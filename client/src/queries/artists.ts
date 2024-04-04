import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchArtist: QueryFunction<
  Artist,
  [{ query: "fetchArtist", artistId: string, includeDefaultTier: boolean }, ...unknown[]]
> = ({ queryKey: [{ artistId, includeDefaultTier }], signal }) => {
  return api.Get<{ result: Artist }>(`v1/artists/${artistId}?includeDefaultTier=${includeDefaultTier}`, { signal })
    .then(r => r.result);
};

export function queryArtist(artistId: string, includeDefaultTier: boolean = false) {
  return queryOptions({
    queryKey: [{ query: "fetchArtist", artistId, includeDefaultTier }],
    queryFn: fetchArtist,
    enabled: !!artistId,
  });
}
