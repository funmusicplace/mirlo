import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, name } = req.query;

    try {
      let where: Prisma.ArtistUserSubscriptionWhereInput = {};

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
