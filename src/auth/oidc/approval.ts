import prisma from "@mirlo/prisma";

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
