import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { getDateRange } from "../../../utils/dateRange";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
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
      let where: Prisma.UserArtistTipWhereInput = {};

      const dateRange = getDateRange(datePurchased);
      if (dateRange) {
        where.datePurchased = dateRange;
      }

      if (pricePaid && pricePaid === "paid") {
        where.transaction = {
          amount: { gt: 0 },
        };
      } else if (pricePaid && pricePaid === "free") {
        where.transaction = {
          amount: 0,
        };
      }

      const itemCount = await prisma.userArtistTip.count({ where });

      const purchases = await prisma.userArtistTip.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          user: true,
          artist: true,
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
