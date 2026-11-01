import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_AUTH } from "./queryKeys";

export type SubsonicCredential = {
  username: string;
  password: string;
  serverUrl: string;
};

export function querySubsonicCredential(userId: number) {
  return queryOptions({
    queryKey: ["fetchSubsonicCredential", { userId }, QUERY_KEY_AUTH],
    queryFn: ({ signal }) =>
      api
        .get<{
          result: SubsonicCredential | null;
        }>(`v1/users/${userId}/subsonic`, { signal })
        .then((r) => r.result),
  });
}

export function useCreateSubsonicCredentialMutation(userId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<object, { result: SubsonicCredential }>(
        `v1/users/${userId}/subsonic`,
        {}
      ),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: querySubsonicCredential(userId).queryKey,
      }),
  });
}

export function useDeleteSubsonicCredentialMutation(userId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.del(`v1/users/${userId}/subsonic`),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: querySubsonicCredential(userId).queryKey,
      }),
  });
}
