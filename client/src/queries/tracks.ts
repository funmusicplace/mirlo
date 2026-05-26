import { QueryFunction, queryOptions } from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_TRACKS } from "./queryKeys";

export type TrackQueryOptions = {
  skip?: number;
  take?: number;
  title?: string;
  q?: string;
};

const fetchTracks: QueryFunction<
  { results: Track[]; total?: number },
  ["fetchTracks", TrackQueryOptions, ...any]
> = ({ queryKey: [_, { skip, take, title, q }], signal }) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (title) params.append("title", title);
  if (q) params.append("q", q);

  return api.get(`v1/tracks?${params}`, { signal });
};

export function queryTracks(opts: TrackQueryOptions) {
  return queryOptions({
    queryKey: ["fetchTracks", opts, QUERY_KEY_TRACKS],
    queryFn: fetchTracks,
  });
}
