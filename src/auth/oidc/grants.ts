import prisma from "@mirlo/prisma";

import { notExpired } from "./adapter";

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
