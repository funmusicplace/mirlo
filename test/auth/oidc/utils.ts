import { createHash, randomBytes } from "node:crypto";

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import request from "supertest";

export const API = process.env.API_DOMAIN ?? "http://localhost:3000";
export const REDIRECT_URI = "https://app.example/callback";

export const createOAuthClient = (
  data: Partial<Prisma.ClientUncheckedCreateInput> = {}
) =>
  prisma.client.create({
    data: {
      applicationName: "OAuth App",
      applicationUrl: "https://app.example",
      allowedCorsOrigins: [],
      key: randomBytes(24).toString("hex"),
      redirectUris: [REDIRECT_URI],
      confidential: true,
      ...data,
    },
  });

export const pkce = () => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
};

export const authorizeParams = (
  clientId: string | number,
  challenge: string,
  extra: Record<string, string> = {}
) =>
  new URLSearchParams({
    client_id: String(clientId),
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "openid profile email",
    state: "some-state",
    nonce: "some-nonce",
    code_challenge: challenge,
    code_challenge_method: "S256",
    ...extra,
  });

export const startAuthorization = async (
  agent: ReturnType<typeof request.agent>,
  clientId: string | number,
  challenge: string,
  extra: Record<string, string> = {}
) => {
  const response = await agent.get(
    `/oidc/auth?${authorizeParams(clientId, challenge, extra)}`
  );
  const location = response.headers.location ?? "";
  const uid = location.match(/\/oauth\/([^/?#]+)$/)?.[1];
  return { response, location, uid };
};
