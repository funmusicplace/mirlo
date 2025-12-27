import { Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { userAuthenticated } from "../../../../auth/passport";

type Query = {
  urlSlug?: string;
  artistId?: number;
  email?: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };

  async function PUT(req: Request, res: Response) {
    const { id } = req.params;
    const loggedInUser = req.user as User;
    try {
      const pledge = await prisma.trackGroupPledge.findFirst({
        where: {
          userId: loggedInUser.id,
          trackGroupId: Number(id),
        },
      });
      if (pledge) {
        await prisma.trackGroupPledge.update({
          where: {
            id: pledge.id,
          },
          data: {
            amount: req.body.amount,
          },
        });
      }
      res.status(200);
      res.json({ result: { success: true } });
    } catch (e) {
      throw e;
    }
  }

  return operations;
}
