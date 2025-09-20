import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_TAGS } from "./queryKeys";

type FilterParams = {
  skip?: number;
  take?: number;
  tag?: string;
  orderBy?: "asc" | "count" | "name";
};

const fetchTags: QueryFunction<
  { results: Tag[]; total?: number },
  ["fetchTags", FilterParams, ...any]
> = ({ queryKey: [_, { skip, take, orderBy, tag }], signal }) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (orderBy) params.append("orderBy", orderBy);
  if (tag) params.append("tag", tag);

  return api.get(`v1/tags?${params}`, { signal });
};

export function queryTags(opts: FilterParams) {
  return queryOptions({
    queryKey: ["fetchTags", opts, QUERY_KEY_TAGS],
    queryFn: fetchTags,
  });
}
