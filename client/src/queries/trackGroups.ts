import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchTrackGroups: QueryFunction<
  { results: TrackGroup[], total?: number },
  [{ query: "fetchTrackGroups", take: number, orderBy: "random" }]
> = ({ queryKey: [{ take, orderBy }], signal }) => {
  return api.Get(`v1/trackGroups?take=${take}&orderBy=${orderBy}`, { signal });
};

export function queryTrackGroups(opts: { take: number, orderBy: "random" }) {
  return queryOptions({
    queryKey: [{ query: "fetchTrackGroups", ...opts }],
    queryFn: fetchTrackGroups,
  });
}
