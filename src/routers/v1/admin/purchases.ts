import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const {
      skip: skipQuery,
      take,
      datePurchased,
      pricePaid,
    } = req.query as {
      skip: string;
      take: string;
      datePurchased: string;
      pricePaid: string;
    };

    try {
      let where: Prisma.UserTransactionWhereInput = {};

      if (datePurchased && datePurchased === "thisMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        where.createdAt = {
          gte: startOfMonth.toISOString(),
        };
      } else if (datePurchased && datePurchased === "previousMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setMonth(startOfMonth.getMonth() - 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date();
        endOfMonth.setDate(1);
        endOfMonth.setHours(0, 0, 0, 0);
        where.createdAt = {
          gte: startOfMonth.toISOString(),
          lt: endOfMonth.toISOString(),
        };
      }

      if (pricePaid && pricePaid === "paid") {
        where.amount = {
          gt: 0,
        };
      } else if (pricePaid && pricePaid === "free") {
        where.amount = 0;
      }

      const itemCount = await prisma.userTransaction.count({ where });

      const purchases = await prisma.userTransaction.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          user: true,
          trackGroupPurchases: {
            include: {
              trackGroup: { include: { artist: true } },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json({
        results: purchases,
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { users, trackGroupId, pricePaid } = req.body as {
      users: { email: string }[];
      trackGroupId: number;
      pricePaid: number;
    };

    try {
      const existingUsers = await prisma.user.findMany({
        where: { email: { in: users.map((s) => s.email) } },
        select: { email: true, id: true },
      });

      await prisma.trackGroup.findFirstOrThrow({
        where: {
          id: trackGroupId,
        },
      });

      await prisma.userTrackGroupPurchase.createMany({
        data: existingUsers.map((user) => ({
          trackGroupId,
          userId: user.id,
          pricePaid,
        })),
      });

      res.json({
        message: "success",
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
