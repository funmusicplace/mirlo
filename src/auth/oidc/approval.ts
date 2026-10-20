import prisma from "@mirlo/prisma";
import type { KoaContextWithOIDC } from "oidc-provider";

export const findClientRow = (clientId: string) =>
  /^\d+$/.test(clientId)
    ? prisma.client.findFirst({
        where: { id: Number(clientId), clientIdUrl: null, deletedAt: null },
      })
    : prisma.client.findFirst({
        where: { clientIdUrl: clientId, deletedAt: null },
      });

export const isClientApproved = async (clientId: string) =>
  (await findClientRow(clientId))?.status === "approved";

const PENDING_ROUTES = new Set(["authorization", "resume"]);

// A metadata-document app that isn't approved yet may reach our interaction
// (to show the "not approved" page) but never the token endpoint.
export const allowMetadataDocumentClient = async (
  ctx: KoaContextWithOIDC | undefined,
  client: { clientId: string }
) => {
  const row = await findClientRow(client.clientId);
  if (row?.status === "approved") {
    return true;
  }
  if (row?.status === "revoked") {
    return false;
  }
  return !ctx || PENDING_ROUTES.has(ctx.oidc?.route ?? "");
};

export const allowMetadataDocumentFetch = async (
  _ctx: KoaContextWithOIDC | undefined,
  clientId: string
) => (await findClientRow(clientId))?.status !== "revoked";
