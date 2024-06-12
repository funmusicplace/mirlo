import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

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
