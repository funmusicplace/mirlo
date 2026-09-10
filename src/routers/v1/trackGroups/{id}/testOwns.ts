import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";

type Query = {
  email?: string;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const { id } = req.params;
    const { email } = req.query as unknown as Query;
    try {
      const identities = [
        ...(email ? [{ user: { email } }] : []),
        ...(req.user ? [{ userId: req.user.id }] : []),
      ];

      let exists = false;
      if (identities.length > 0) {
        const purchase = await prisma.userTrackGroupPurchase.findFirst({
          where: {
            OR: identities,
            trackGroupId: Number(id),
          },
        });
        exists = !!purchase;
      }
      res.status(200);
      res.json({ result: { exists } });
    } catch {
      res.status(400);
      res.json({
        error: "Invalid route",
      });
    }
  }

  return operations;
}
