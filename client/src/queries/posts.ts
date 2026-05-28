import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getInjectedPost } from "utils/injectedData";

import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_POSTS } from "./queryKeys";

const fetchPost: QueryFunction<
  Post,
  ["fetchPost", { postId: string; artistId: string }]
> = ({ queryKey: [_, { postId, artistId }], signal }) => {
  return api
    .get<{
      result: Post;
    }>(`v1/posts/${postId}?artistId=${artistId}`, {
      signal,
    })
    .then((r) => r.result);
};

export function queryPost(opts: { postId: string; artistId: string }) {
  return queryOptions({
    queryKey: [
      "fetchPost",
      {
        postId: opts.postId,
        artistId: opts.artistId,
      },
    ],
    queryFn: fetchPost,
    enabled: !!opts.postId,
    initialData: () => getInjectedPost(opts.postId, opts.artistId),
    refetchOnMount: "always",
  });
}

const fetchArtistPosts: QueryFunction<
  { results: Post[]; total?: number },
  [
    "fetchArtistPosts",
    { take: number; skip: number; artistId: number | string },
  ]
> = ({ queryKey: [_, { take, skip = 0, artistId }], signal }) => {
  return api.get(`v1/artists/${artistId}/posts?take=${take}&skip=${skip}`, {
    signal,
  });
};

export function queryArtistPosts(opts: {
  take: number;
  artistId: number | string;
  skip: number;
}) {
  return queryOptions({
    queryKey: ["fetchArtistPosts", opts],
    queryFn: fetchArtistPosts,
  });
}

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

const fetchManagedArtistPosts: QueryFunction<
  { results: Post[] },
  ["fetchManagedArtistPosts", { artistId: number }]
> = ({ queryKey: [_, { artistId }], signal }) => {
  return api.get(`v1/manage/artists/${artistId}/posts`, { signal });
};

export function queryManagedArtistPosts(artistId: number) {
  return queryOptions({
    queryKey: ["fetchManagedArtistPosts", { artistId }],
    queryFn: fetchManagedArtistPosts,
    enabled: !!artistId,
  });
}

async function createPost(opts: { artistId: number }) {
  return api.post<Partial<Post>, { result: Post }>(
    `v1/manage/artists/${opts.artistId}/posts`,
    { title: "", content: "", isPublic: false }
  );
}

export function useCreatePostMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    async onSuccess(_, { artistId }) {
      await client.invalidateQueries({
        queryKey: ["fetchManagedArtistPosts", { artistId }],
      });
    },
  });
}

async function deletePost(opts: { postId: number; artistId: number }) {
  return api.del(`v1/manage/posts/${opts.postId}`);
}

export function useDeletePostMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deletePost,
    async onSuccess(_, { artistId }) {
      await client.invalidateQueries({
        queryKey: ["fetchManagedArtistPosts", { artistId }],
      });
    },
  });
}
