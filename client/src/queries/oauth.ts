import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_AUTH } from "./queryKeys";

export type OAuthApproval = "approved" | "pending" | "revoked" | "unknown";

export type OAuthInteraction = {
  client: {
    name: string;
    uri: string | null;
    logoUri: string | null;
    domain: string;
  };
  approval: OAuthApproval;
  redirectHost: string;
  scopes: string[];
  loggedIn: boolean;
  needsConsent: boolean;
};

export function queryOAuthInteraction(uid: string) {
  return queryOptions({
    queryKey: ["fetchOAuthInteraction", { uid }, QUERY_KEY_AUTH],
    queryFn: ({ signal }) =>
      api
        .get<{ result: OAuthInteraction }>(`oauth/${uid}/details`, { signal })
        .then((r) => r.result),
    retry: false,
    staleTime: Infinity,
  });
}

export type OAuthDecision = "allow" | "deny";

export function useOAuthDecisionMutation(uid: string) {
  return useMutation({
    mutationFn: (action: OAuthDecision) =>
      api
        .post<
          { action: OAuthDecision },
          { result: { redirectTo: string } }
        >(`oauth/${uid}/decision`, { action })
        .then((r) => r.result.redirectTo),
    onSuccess: (redirectTo) => window.location.assign(redirectTo),
  });
}

export function useRequestOAuthApprovalMutation(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ action: "requestApproval" }, unknown>(
        `oauth/${uid}/decision`,
        { action: "requestApproval" }
      ),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: queryOAuthInteraction(uid).queryKey,
      }),
  });
}

export type ConnectedApp = {
  id: string;
  clientId: string;
  name: string;
  url: string | null;
  scopes: string[];
  createdAt: string | null;
  lastUsedAt: string | null;
};

export function queryConnectedApps(userId: number) {
  return queryOptions({
    queryKey: ["fetchConnectedApps", { userId }, QUERY_KEY_AUTH],
    queryFn: ({ signal }) =>
      api
        .get<{
          results: ConnectedApp[];
        }>(`v1/users/${userId}/connectedApps`, { signal })
        .then((r) => r.results),
  });
}

export function useRevokeConnectedAppMutation(userId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) =>
      api.del(`v1/users/${userId}/connectedApps/${grantId}`, {}),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: queryConnectedApps(userId).queryKey,
      }),
  });
}
