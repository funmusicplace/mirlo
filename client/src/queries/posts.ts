import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_POSTS } from "./queryKeys";

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

const fetchManagedPost: QueryFunction<
  Post,
  ["fetchManagedPost", { postId?: number }, ...any]
> = ({ queryKey: [_, { postId }], signal }) => {
  return api
    .get<{ result: Post }>(`v1/manage/posts/${postId}`, { signal })
    .then((r) => r.result);
};

export function queryManagedPost(postId?: number) {
  return queryOptions({
    queryKey: ["fetchManagedPost", { postId }, QUERY_KEY_POSTS],
    queryFn: fetchManagedPost,
  });
}
