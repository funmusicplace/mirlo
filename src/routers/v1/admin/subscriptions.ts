import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { set } from "lodash";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, lastSubscription } = req.query;

    try {
      let where: Prisma.ArtistUserSubscriptionWhereInput = {};

      if (lastSubscription && lastSubscription === "thisMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        set(
          where,
          "artistUserSubscriptionCharges.some.createdAt.gte",
          startOfMonth.toISOString()
        );
      } else if (lastSubscription && lastSubscription === "previousMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setMonth(startOfMonth.getMonth() - 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date();
        endOfMonth.setDate(1);
        endOfMonth.setHours(0, 0, 0, 0);
        set(
          where,
          "artistUserSubscriptionCharges.some.createdAt.gte",
          startOfMonth.toISOString()
        );
        set(
          where,
          "artistUserSubscriptionCharges.some.createdAt.lt",
          endOfMonth.toISOString()
        );
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
          artistUserSubscriptionCharges: true,
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
