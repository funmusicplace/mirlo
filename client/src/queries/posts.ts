import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchPosts: QueryFunction<
  { results: Post[]; total?: number },
  ["fetchPosts", { take: number }]
> = ({ queryKey: [_, { take }], signal }) => {
  return api.get(`v1/posts?take=${take}`, { signal });
};

export function queryPosts(opts: { take: number }) {
  return queryOptions({
    queryKey: ["fetchPosts", opts],
    queryFn: fetchPosts,
  });
}
