import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";

import prisma from "@mirlo/prisma";
import { AppError } from "../../../../utils/error";
import { processSingleMerch } from "../../../../utils/merch";
import { User } from "@mirlo/prisma/client";

type Params = {
  merchId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const user = req.user as User;

    try {
      const total = await prisma.merchPurchase.count({
        where: {
          merch: { artist: { userId: user.id } },
        },
      });
      const purchases = await prisma.merchPurchase.findMany({
        where: {
          merch: { artist: { userId: user.id } },
        },
        include: {
          merch: {
            include: {
              artist: true,
            },
          },
          options: {
            include: {
              merchOptionType: true,
            },
          },
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        results: purchases,
        total,
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
