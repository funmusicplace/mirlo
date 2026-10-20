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

type Agent = ReturnType<typeof request.agent>;

const jarOf = (agent: Agent) =>
  (
    agent as unknown as {
      jar: {
        setCookie: (cookie: string, domain: string, path: string) => void;
      };
    }
  ).jar;

export const signIn = (
  agent: ReturnType<typeof request.agent>,
  accessToken: string
) => {
  jarOf(agent).setCookie(`jwt=${accessToken}`, new URL(API).hostname, "/");
};

export const signOut = (agent: ReturnType<typeof request.agent>) => {
  jarOf(agent).setCookie(
    "jwt=; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    new URL(API).hostname,
    "/"
  );
};

export const pathOf = (url: string) => {
  const parsed = new URL(url);
  return parsed.pathname + parsed.search;
};

export const decide = async (
  agent: ReturnType<typeof request.agent>,
  uid: string,
  action: string
) => {
  const response = await agent
    .post(`/oauth/${uid}/decision`)
    .send({ action })
    .set("Accept", "application/json");
  return response;
};

// Runs authorize → decision → resume and returns the redirect back to the app.
export const authorizeAndAllow = async (
  agent: ReturnType<typeof request.agent>,
  clientId: string | number,
  challenge: string,
  extra: Record<string, string> = {}
) => {
  const { uid } = await startAuthorization(agent, clientId, challenge, extra);
  if (!uid) {
    throw new Error("authorization didn't reach the interaction");
  }
  const decision = await decide(agent, uid, "allow");
  if (decision.status !== 200) {
    throw new Error(`decision failed: ${decision.status} ${decision.text}`);
  }
  const resume = await agent.get(pathOf(decision.body.result.redirectTo));
  return new URL(resume.headers.location);
};

export const exchangeCode = (
  client: { id: number; key: string | null },
  code: string,
  verifier: string
) =>
  request(API)
    .post("/oidc/token")
    .auth(String(client.id), client.key ?? "")
    .type("form")
    .send({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    });

export const tokensFor = async (
  accessToken: string,
  client: { id: number; key: string | null },
  scope: string,
  extra: Record<string, string> = {}
) => {
  const agent = request.agent(API);
  signIn(agent, accessToken);
  const { verifier, challenge } = pkce();
  const callback = await authorizeAndAllow(agent, client.id, challenge, {
    scope,
    ...extra,
  });
  const response = await exchangeCode(
    client,
    callback.searchParams.get("code")!,
    verifier
  );
  if (response.status !== 200) {
    throw new Error(`token request failed: ${response.text}`);
  }
  return response.body as {
    access_token: string;
    refresh_token?: string;
    scope: string;
  };
};
