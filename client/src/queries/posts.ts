import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchPosts: QueryFunction<
  { results: Post[], total?: number },
  [{ query: "fetchPosts", take: number }]
> = ({ queryKey: [{ take }], signal }) => {
  return api.Get(`v1/posts?take=${take}`, { signal });
};

export function queryPosts(opts: { take: number }) {
  return queryOptions({
    queryKey: [{ query: "fetchPosts", ...opts }],
    queryFn: fetchPosts,
  });
}
