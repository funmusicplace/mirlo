import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchTip: QueryFunction<
  UserArtistTip,
  ["fetchTip", { artistId: string; artistSlug: string; tipId: string }]
> = ({ queryKey: [_, { artistId, artistSlug, tipId }], signal }) => {
  return api
    .get<{
      result: UserArtistTip;
    }>(`/v1/artists/${artistId}/${artistSlug}/${tipId}`, {
      signal,
    })
    .then((r) => r.result);
};

export function queryTip(opts: {
  artistId: string;
  artistSlug: string;
  tipId: string;
}) {
  return queryOptions({
    queryKey: [
      "fetchTip",
      {
        artistId: opts.artistId,
        artistSlug: opts.artistSlug,
        tipId: opts.tipId,
      },
    ],
    queryFn: fetchTip,
  });
}
