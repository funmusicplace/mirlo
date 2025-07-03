import { Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { User } from "@mirlo/prisma/client";

type Query = {
  urlSlug?: string;
  artistId?: number;
  email?: string;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const { id } = req.params;
    const { email } = req.query as unknown as Query;
    const user = req.user as User;
    try {
      let userEmail = email;
      let exists = false;
      if (!userEmail) {
        userEmail = user.email;
      }
      if (userEmail) {
        const purchase = await prisma.userTrackPurchase.findFirst({
          where: {
            user: {
              email: userEmail,
            },
            trackId: Number(id),
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
