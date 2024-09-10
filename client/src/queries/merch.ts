import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_MERCH, queryKeyIncludes } from "./queryKeys";

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
