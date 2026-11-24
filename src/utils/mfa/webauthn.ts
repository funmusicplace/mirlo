import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import { getClient } from "../getClient";

type StoredCredential = {
  credentialId: string;
  publicKey: Uint8Array;
  counter: bigint;
  transports: string[];
};

const relyingParty = async () => {
  const url = new URL((await getClient()).applicationUrl);
  return { rpID: url.hostname, origin: url.origin };
};

const descriptor = (credential: StoredCredential) => ({
  id: credential.credentialId,
  transports: credential.transports as AuthenticatorTransportFuture[],
});

export type WebAuthnKeyKind = "securityKey" | "passkey";

export const registrationOptions = async (
  user: { id: number; email: string },
  existing: StoredCredential[],
  instanceName: string,
  kind: WebAuthnKeyKind
) =>
  generateRegistrationOptions({
    rpName: instanceName,
    rpID: (await relyingParty()).rpID,
    userName: user.email,
    userID: new Uint8Array(new TextEncoder().encode(`mirlo-user-${user.id}`)),
    attestationType: "none",
    excludeCredentials: existing.map(descriptor),
    authenticatorSelection: {
      residentKey: kind === "securityKey" ? "discouraged" : "preferred",
      userVerification: "preferred",
    },
    preferredAuthenticatorType:
      kind === "securityKey" ? "securityKey" : undefined,
  });

export const verifyRegistration = async (
  response: RegistrationResponseJSON,
  expectedChallenge: string
) => {
  const { rpID, origin } = await relyingParty();
  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });
  if (!verified || !registrationInfo) {
    return null;
  }
  const { credential } = registrationInfo;
  return {
    credentialId: credential.id,
    publicKey: credential.publicKey,
    counter: BigInt(credential.counter),
    transports: credential.transports ?? response.response.transports ?? [],
  };
};

export const authenticationOptions = async (existing: StoredCredential[]) =>
  generateAuthenticationOptions({
    rpID: (await relyingParty()).rpID,
    allowCredentials: existing.map(descriptor),
    userVerification: "preferred",
  });

export const verifyAuthentication = async (
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  stored: StoredCredential
) => {
  const { rpID, origin } = await relyingParty();
  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
    credential: {
      id: stored.credentialId,
      publicKey: new Uint8Array(stored.publicKey),
      counter: Number(stored.counter),
      transports: stored.transports as AuthenticatorTransportFuture[],
    },
  });
  return verified ? BigInt(authenticationInfo.newCounter) : null;
};
