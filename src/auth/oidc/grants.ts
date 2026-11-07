import prisma from "@mirlo/prisma";

import { notExpired } from "./adapter";
import { isMetadataDocumentClientId } from "./approval";

export const grantedScopes = async (accountId: number, clientId: string) => {
  const grants = await prisma.oAuthPayload.findMany({
    where: {
      model: "Grant",
      accountId,
      payload: { path: ["clientId"], equals: clientId },
      ...notExpired(),
    },
    select: { payload: true },
  });
  return new Set(
    grants.flatMap(
      (grant) => (grant.payload as GrantPayload).openid?.scope?.split(" ") ?? []
    )
  );
};

type GrantPayload = {
  clientId?: string;
  iat?: number;
  openid?: { scope?: string };
};

const fromEpoch = (seconds?: number) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

export const listConnectedApps = async (accountId: number) => {
  const allGrants = await prisma.oAuthPayload.findMany({
    where: { model: "Grant", accountId, ...notExpired() },
  });
  const tokens = await prisma.oAuthPayload.findMany({
    where: {
      grantId: { in: allGrants.map((grant) => grant.id) },
      model: { in: ["AccessToken", "RefreshToken"] },
    },
    select: { grantId: true, payload: true, expiresAt: true },
  });
  // A grant outlives its tokens, so list only sign-ins with a live one
  const grants = allGrants.filter((grant) =>
    tokens.some(
      (token) =>
        token.grantId === grant.id &&
        (!token.expiresAt || token.expiresAt > new Date())
    )
  );
  const clientIds = grants.map(
    (grant) => (grant.payload as GrantPayload).clientId ?? ""
  );
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        {
          id: {
            in: clientIds
              .filter((id) => !isMetadataDocumentClientId(id))
              .map(Number),
          },
        },
        { clientIdUrl: { in: clientIds } },
      ],
      deletedAt: {},
    },
  });

  return grants.map((grant) => {
    const payload = grant.payload as GrantPayload;
    const client = clients.find(
      (c) =>
        String(c.id) === payload.clientId || c.clientIdUrl === payload.clientId
    );
    const lastUsed = Math.max(
      0,
      ...tokens
        .filter((token) => token.grantId === grant.id)
        .map((token) => (token.payload as GrantPayload).iat ?? 0)
    );
    return {
      id: grant.id,
      clientId: payload.clientId,
      name: client?.applicationName ?? payload.clientId,
      url: client?.applicationUrl ?? null,
      scopes: payload.openid?.scope?.split(" ") ?? [],
      createdAt: fromEpoch(payload.iat),
      lastUsedAt: fromEpoch(lastUsed),
    };
  });
};

export const revokeConnectedApp = async (
  accountId: number,
  grantId: string
) => {
  const { count } = await prisma.oAuthPayload.deleteMany({
    where: { model: "Grant", id: grantId, accountId },
  });
  if (count) {
    await prisma.oAuthPayload.deleteMany({ where: { grantId } });
  }
  return count > 0;
};

export const revokeAllConnectedApps = (
  accountId: number,
  db: Pick<typeof prisma, "oAuthPayload"> = prisma
) => db.oAuthPayload.deleteMany({ where: { accountId } });

export const revokeClientTokens = (client: {
  id: number;
  clientIdUrl: string | null;
}) =>
  prisma.oAuthPayload.deleteMany({
    where: {
      payload: {
        path: ["clientId"],
        equals: client.clientIdUrl ?? String(client.id),
      },
    },
  });
