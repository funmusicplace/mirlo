import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { set } from "lodash";
import { getDateRange } from "../../../utils/dateRange";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const {
      skip: skipQuery,
      take,
      lastSubscription,
    } = req.query as {
      skip: string;
      take: string;
      lastSubscription: string;
    };

    try {
      let where: Prisma.ArtistUserSubscriptionWhereInput = {};

      const dateRange = getDateRange(lastSubscription);
      if (dateRange) {
        set(
          where,
          "artistUserSubscriptionCharges.some.createdAt.gte",
          dateRange.gte
        );
        if (dateRange.lt) {
          set(
            where,
            "artistUserSubscriptionCharges.some.createdAt.lt",
            dateRange.lt
          );
        }
      }

      const itemCount = await prisma.artistUserSubscription.count({ where });

      const subscriptions = await prisma.artistUserSubscription.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          user: true,
          artistSubscriptionTier: {
            include: {
              artist: true,
            },
          },
          artistUserSubscriptionCharges: {
            include: {
              transaction: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json({
        results: subscriptions,
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all subscriptions",
    responses: {
      200: {
        description: "A list of subscriptions",
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
