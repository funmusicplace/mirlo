import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_ADMIN_MFA, QUERY_KEY_AUTH } from "./queryKeys";

export type SecurityKey = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type MfaStatus = {
  verified: boolean;
  verifiedUntil: string | null;
  hasFactors: boolean;
  totpEnabled: boolean;
  recoveryCodesRemaining: number;
  securityKeys: SecurityKey[];
};

export type TotpSetup = {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
};

type RecoveryCodesResult = { recoveryCodes?: string[] };

export function queryMfaStatus() {
  return queryOptions({
    queryKey: ["fetchMfaStatus", QUERY_KEY_ADMIN_MFA, QUERY_KEY_AUTH],
    queryFn: ({ signal }) =>
      api
        .get<{ result: MfaStatus }>("auth/mfa", { signal })
        .then((r) => r.result),
    retry: false,
  });
}

const postResult = <R>(endpoint: string, body: unknown = {}) =>
  api.post<unknown, { result: R }>(endpoint, body).then((r) => r.result);

const delResult = <R>(endpoint: string) =>
  api.del<{ result: R }>(endpoint).then((r) => r.result);

function useMfaMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_AUTH),
      }),
  });
}

export type SecurityKeyKind = "securityKey" | "passkey";

export async function fetchRegistrationOptions(kind: SecurityKeyKind) {
  return postResult<PublicKeyCredentialCreationOptionsJSON>(
    "auth/mfa/webauthn/registration-options",
    { kind }
  );
}

export async function fetchAuthenticationOptions() {
  return postResult<PublicKeyCredentialRequestOptionsJSON>(
    "auth/mfa/webauthn/authentication-options"
  );
}

export function useRegisterSecurityKeyMutation() {
  return useMfaMutation(
    (body: { name: string; response: RegistrationResponseJSON }) =>
      postResult<RecoveryCodesResult>("auth/mfa/webauthn/register", body)
  );
}

export function useAuthenticateSecurityKeyMutation() {
  return useMfaMutation((response: AuthenticationResponseJSON) =>
    postResult<{ verified: true }>("auth/mfa/webauthn/authenticate", {
      response,
    })
  );
}

export function useRemoveSecurityKeyMutation() {
  return useMfaMutation((id: string) =>
    delResult<{ removed: true }>(`auth/mfa/webauthn/${id}`)
  );
}

export function useTotpSetupMutation() {
  return useMutation({
    mutationFn: () => postResult<TotpSetup>("auth/mfa/totp/setup"),
  });
}

export function useEnableTotpMutation() {
  return useMfaMutation((code: string) =>
    postResult<RecoveryCodesResult>("auth/mfa/totp/enable", { code })
  );
}

export function useVerifyTotpMutation() {
  return useMfaMutation((code: string) =>
    postResult<{ verified: true }>("auth/mfa/totp/verify", { code })
  );
}

export function useDisableTotpMutation() {
  return useMfaMutation<void, { removed: true }>(() =>
    delResult("auth/mfa/totp")
  );
}

export function useRegenerateRecoveryCodesMutation() {
  return useMfaMutation<void, { recoveryCodes: string[] }>(() =>
    postResult("auth/mfa/recovery-codes")
  );
}

export function useRedeemRecoveryCodeMutation() {
  return useMfaMutation((code: string) =>
    postResult<{ verified: true; recoveryCodesRemaining: number }>(
      "auth/mfa/recovery",
      { code }
    )
  );
}
