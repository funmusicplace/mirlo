import prisma from "@mirlo/prisma";

import { notExpired } from "./adapter";
import { isMetadataDocumentClientId } from "./approval";

type GrantPayload = {
  clientId?: string;
  iat?: number;
  openid?: { scope?: string };
};

const iatOf = (row: { payload: unknown }) =>
  (row.payload as GrantPayload).iat ?? 0;

const scopesOf = (grants: { payload: unknown }[]) =>
  new Set(
    grants.flatMap(
      (grant) => (grant.payload as GrantPayload).openid?.scope?.split(" ") ?? []
    )
  );

export const grantedScopes = async (accountId: number, clientId: string) =>
  scopesOf(
    await prisma.oAuthPayload.findMany({
      where: {
        model: "Grant",
        accountId,
        payload: { path: ["clientId"], equals: clientId },
        ...notExpired(),
      },
      select: { payload: true },
    })
  );

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
  const apps = Map.groupBy(
    grants.sort((a, b) => iatOf(a) - iatOf(b)),
    (grant) => (grant.payload as GrantPayload).clientId ?? ""
  );
  const clientIds = [...apps.keys()];
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

  return [...apps].map(([clientId, appGrants]) => {
    const client = clients.find(
      (c) => String(c.id) === clientId || c.clientIdUrl === clientId
    );
    const grantIds = new Set(appGrants.map((grant) => grant.id));
    const lastUsed = Math.max(
      0,
      ...tokens.filter((token) => grantIds.has(token.grantId ?? "")).map(iatOf)
    );
    return {
      id: appGrants[appGrants.length - 1].id,
      clientId,
      name: client?.applicationName ?? clientId,
      url: client?.applicationUrl ?? null,
      scopes: [...scopesOf(appGrants)],
      createdAt: fromEpoch(iatOf(appGrants[0])),
      lastUsedAt: fromEpoch(lastUsed),
    };
  });
};

export const revokeConnectedApp = async (
  accountId: number,
  grantId: string
) => {
  const grant = await prisma.oAuthPayload.findFirst({
    where: { model: "Grant", id: grantId, accountId },
    select: { payload: true },
  });
  const clientId = (grant?.payload as GrantPayload | undefined)?.clientId;
  if (!clientId) {
    return false;
  }
  await prisma.oAuthPayload.deleteMany({
    where: { accountId, payload: { path: ["clientId"], equals: clientId } },
  });
  return true;
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
