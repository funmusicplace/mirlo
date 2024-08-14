import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_TAGS } from "./queryKeys";

const fetchTags: QueryFunction<
  { results: Tag[]; total?: number },
  [
    "fetchTags",
    {
      skip?: number;
      take?: number;
      orderBy?: "asc" | "count";
    },
    ...any,
  ]
> = ({ queryKey: [_, { skip, take, orderBy }], signal }) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (orderBy) params.append("orderBy", orderBy);

  return api.get(`v1/tags?${params}`, { signal });
};

export function queryTags(opts: {
  skip?: number;
  take?: number;
  orderBy?: "asc" | "count";
}) {
  return queryOptions({
    queryKey: ["fetchTags", opts, QUERY_KEY_TAGS],
    queryFn: fetchTags,
  });
}
