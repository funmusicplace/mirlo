import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import {
  QUERY_KEY_MERCH,
  queryKeyIncludes,
  queryKeyMatches,
} from "./queryKeys";

const fetchMerch: QueryFunction<
  Merch,
  ["fetchMerch", { merchId: string; artistId: string }]
> = ({ queryKey: [_, { merchId, artistId }], signal }) => {
  return api
    .get<{
      result: Merch;
    }>(`v1/merch/${merchId}?artistId=${artistId}`, {
      signal,
    })
    .then((r) => r.result);
};

export function queryMerch(opts: { merchId: string; artistId: string }) {
  return queryOptions({
    queryKey: [
      "fetchMerch",
      {
        merchId: opts.merchId,
        artistId: opts.artistId,
      },
    ],
    queryFn: fetchMerch,
  });
}

async function createMerch(opts: {
  merch: Partial<Merch>;
}): Promise<{ result: Merch }> {
  return await api.post(
    `v1/manage/artists/${opts.merch.artistId}/merch`,
    opts.merch
  );
}

export function useCreateMerchMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createMerch,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => queryKeyIncludes(query, QUERY_KEY_MERCH),
      });
    },
  });
}
async function deleteMerch({ merchId }: { merchId: string }) {
  return api.del(`v1/manage/merch/${merchId}`);
}

export function useDeleteMerchMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteMerch,
    async onSuccess(_, { merchId }) {
      await client.invalidateQueries({
        predicate: (query) =>
          queryKeyMatches(query, { merchId }) ||
          queryKeyIncludes(query, QUERY_KEY_MERCH),
      });
    },
  });
}
