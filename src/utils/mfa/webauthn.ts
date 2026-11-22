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

type StoredCredential = {
  credentialId: string;
  publicKey: Uint8Array;
  counter: bigint;
  transports: string[];
};

const relyingParty = () => {
  const url = new URL(
    process.env.CLIENT_DOMAIN ?? process.env.API_DOMAIN ?? "http://localhost"
  );
  return { rpID: url.hostname, origin: url.origin };
};

const descriptor = (credential: StoredCredential) => ({
  id: credential.credentialId,
  transports: credential.transports as AuthenticatorTransportFuture[],
});

export const registrationOptions = (
  user: { id: number; email: string },
  existing: StoredCredential[],
  instanceName: string
) =>
  generateRegistrationOptions({
    rpName: instanceName,
    rpID: relyingParty().rpID,
    userName: user.email,
    userID: new TextEncoder().encode(`mirlo-user-${user.id}`),
    attestationType: "none",
    excludeCredentials: existing.map(descriptor),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

export const verifyRegistration = async (
  response: RegistrationResponseJSON,
  expectedChallenge: string
) => {
  const { rpID, origin } = relyingParty();
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

export const authenticationOptions = (existing: StoredCredential[]) =>
  generateAuthenticationOptions({
    rpID: relyingParty().rpID,
    allowCredentials: existing.map(descriptor),
    userVerification: "preferred",
  });

export const verifyAuthentication = async (
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  stored: StoredCredential
) => {
  const { rpID, origin } = relyingParty();
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
