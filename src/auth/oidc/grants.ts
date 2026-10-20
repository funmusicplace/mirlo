import prisma from "@mirlo/prisma";

import { notExpired } from "./adapter";
import { isMetadataDocumentClientId } from "./approval";

export const findGrantId = async (accountId: number, clientId: string) =>
  (
    await prisma.oAuthPayload.findFirst({
      where: {
        model: "Grant",
        accountId,
        payload: { path: ["clientId"], equals: clientId },
        ...notExpired(),
      },
      select: { id: true },
    })
  )?.id;

type GrantPayload = {
  clientId?: string;
  iat?: number;
  openid?: { scope?: string };
};

const fromEpoch = (seconds?: number) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

export const listConnectedApps = async (accountId: number) => {
  const grants = await prisma.oAuthPayload.findMany({
    where: { model: "Grant", accountId, ...notExpired() },
  });
  const tokens = await prisma.oAuthPayload.findMany({
    where: {
      grantId: { in: grants.map((grant) => grant.id) },
      model: { in: ["AccessToken", "RefreshToken"] },
    },
    select: { grantId: true, payload: true },
  });
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

export const revokeAllConnectedApps = (accountId: number) =>
  prisma.oAuthPayload.deleteMany({ where: { accountId } });
