import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchTrackGroups: QueryFunction<
  { results: TrackGroup[]; total?: number },
  ["fetchTrackGroups", { take: number; orderBy: "random" }]
> = ({ queryKey: [_, { take, orderBy }], signal }) => {
  return api.get(`v1/trackGroups?take=${take}&orderBy=${orderBy}`, { signal });
};

export function queryTrackGroups(opts: { take: number; orderBy: "random" }) {
  return queryOptions({
    queryKey: ["fetchTrackGroups", opts],
    queryFn: fetchTrackGroups,
  });
}
