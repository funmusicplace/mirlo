import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const {
      skip: skipQuery,
      take,
      datePurchased,
    } = req.query as { skip: string; take: string; datePurchased: string };

    try {
      let where: Prisma.UserTrackGroupPurchaseWhereInput = {};

      if (datePurchased && datePurchased === "thisMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        where.datePurchased = {
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
        where.datePurchased = {
          gte: startOfMonth.toISOString(),
          lt: endOfMonth.toISOString(),
        };
      }

      const itemCount = await prisma.userTrackGroupPurchase.count({ where });

      const purchases = await prisma.userTrackGroupPurchase.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          user: true,
          trackGroup: {
            include: {
              artist: true,
            },
          },
        },
        orderBy: {
          datePurchased: "desc",
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

  GET.apiDoc = {
    summary: "Returns all purchases",
    responses: {
      200: {
        description: "A list of purchases",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
