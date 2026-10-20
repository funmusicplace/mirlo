import { queryOptions, useMutation } from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_AUTH } from "./queryKeys";

export type OAuthInteraction = {
  client: { name: string; uri: string | null; logoUri: string | null };
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
