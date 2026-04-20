import { Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../../auth/passport";
import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { AppError } from "../../../../utils/error";

type Query = {
  urlSlug?: string;
  artistId?: number;
  email?: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
    DELETE: [userAuthenticated, DELETE],
  };

  async function DELETE(req: Request, res: Response) {
    const { id } = req.params;
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const pledge = await prisma.fundraiserPledge.findFirst({
        where: {
          userId: loggedInUser.id,
          fundraiserId: Number(id),
        },
      });
      if (pledge) {
        await prisma.fundraiserPledge.update({
          where: {
            id: pledge.id,
          },
          data: {
            cancelledAt: new Date(),
          },
        });
      }
      res.status(200);
      res.json({ result: { success: true } });
    } catch (e) {
      throw e;
    }
  }

  async function PUT(req: Request, res: Response) {
    const { id } = req.params;
    const { amount } = req.body;
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const pledge = await prisma.fundraiserPledge.findFirst({
        where: {
          userId: loggedInUser.id,
          fundraiserId: Number(id),
          cancelledAt: null,
        },
        include: {
          fundraiser: { include: { trackGroups: true } },
        },
      });
      if (pledge) {
        if (amount < (pledge.fundraiser.trackGroups[0]?.minPrice ?? 0)) {
          throw new AppError({
            httpCode: 400,
            description: "Pledge amount is below the minimum required.",
          });
        }
        await prisma.fundraiserPledge.update({
          where: {
            id: pledge.id,
          },
          data: {
            amount,
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
