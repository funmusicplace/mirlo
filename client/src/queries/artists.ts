import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchArtist: QueryFunction<
  Artist,
  [
    { query: "fetchArtist"; artistSlug: string; includeDefaultTier: boolean },
    ...unknown[],
  ]
> = ({ queryKey: [{ artistSlug, includeDefaultTier }], signal }) => {
  return api
    .Get<{
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
      {
        query: "fetchArtist",
        artistSlug: opts.artistSlug,
        includeDefaultTier: opts.includeDefaultTier ?? false,
      },
    ],
    queryFn: fetchArtist,
    enabled: !!opts.artistSlug,
  });
}
