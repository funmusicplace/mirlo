import { Request, Response } from "express";
import prisma from "../../../../../prisma/prisma";
import { findTrackGroupIdForSlug } from "../../../../utils/trackGroup";

type Query = {
  urlSlug?: string;
  artistId?: number;
  email?: string;
};

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response) {
    const { id } = req.params;
    const { email } = req.query as unknown as Query;
    try {
      let exists = false;
      if (email) {
        const purchase = await prisma.userTrackGroupPurchase.findFirst({
          where: {
            user: {
              email,
            },
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
