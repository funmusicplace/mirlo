import prisma from "@mirlo/prisma";
import type { KoaContextWithOIDC } from "oidc-provider";

export type ApprovalStatus = "approved" | "pending" | "revoked" | "unknown";

export const isMetadataDocumentClientId = (clientId: string) =>
  !/^\d+$/.test(clientId);

export const findClientRow = (clientId: string) =>
  isMetadataDocumentClientId(clientId)
    ? prisma.client.findFirst({
        where: { clientIdUrl: clientId, deletedAt: null },
      })
    : prisma.client.findFirst({
        where: { id: Number(clientId), clientIdUrl: null, deletedAt: null },
      });

export const approvalStatusOf = async (
  clientId: string
): Promise<ApprovalStatus> => {
  if (!isMetadataDocumentClientId(clientId)) {
    return (await findClientRow(clientId))?.status ?? "unknown";
  }
  const row = await prisma.client.findFirst({
    where: { clientIdUrl: clientId, deletedAt: {} },
  });
  if (row?.status === "revoked") {
    return "revoked";
  }
  return row && !row.deletedAt ? row.status : "unknown";
};

const PENDING_ROUTES = new Set(["authorization", "resume"]);

export const allowMetadataDocumentClient = async (
  ctx: KoaContextWithOIDC | undefined,
  client: { clientId: string }
) => {
  const status = await approvalStatusOf(client.clientId);
  if (status === "approved") {
    return true;
  }
  if (status === "revoked") {
    return false;
  }
  return !ctx || PENDING_ROUTES.has(ctx.oidc?.route ?? "");
};

export const allowMetadataDocumentFetch = async (
  _ctx: KoaContextWithOIDC | undefined,
  clientId: string
) => (await approvalStatusOf(clientId)) !== "revoked";
