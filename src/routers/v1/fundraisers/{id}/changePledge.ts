import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import {
  siteUserAuthenticated,
  userOrAppAuthenticated,
} from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { getCurrency, minimumPledge } from "../../../../utils/stripe/currency";

type Query = {
  email?: string;
};

export default function () {
  const operations = {
    PUT: [siteUserAuthenticated, PUT],
    DELETE: [userOrAppAuthenticated, DELETE],
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
          paidAt: null,
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
          paidAt: null,
        },
        include: { fundraiser: true },
      });
      if (!pledge) {
        throw new AppError({
          httpCode: 404,
          description: "Pledge not found",
        });
      }
      if (pledge.fundraiser.status !== "ACTIVE") {
        throw new AppError({
          httpCode: 400,
          description: "This fundraiser is no longer accepting pledges",
        });
      }
      const currency = await getCurrency(pledge.fundraiser.profileId);
      if (amount < minimumPledge(pledge.fundraiser.minPledge, currency)) {
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
      res.status(200);
      res.json({ result: { success: true } });
    } catch (e) {
      throw e;
    }
  }

  return operations;
}
