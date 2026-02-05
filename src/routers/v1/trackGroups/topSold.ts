import { Prisma, User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import processor, {
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { take = 50, datePurchased } = req.query;
    const loggedInUser = req.user as User | null;

    try {
      let where: Prisma.TrackGroupWhereInput = whereForPublishedTrackGroups();
      let topWhere: Prisma.UserTransactionWhereInput = {
        trackGroupPurchases: {
          some: {
            trackGroup: whereForPublishedTrackGroups(),
          },
        },
      };

      if (datePurchased === "pastMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(startOfMonth.getDate() - 30);

        topWhere.createdAt = {
          gte: startOfMonth.toISOString(),
        };
      }

      const transactions = await prisma.userTransaction.findMany({
        where: topWhere,
        include: {
          trackGroupPurchases: true,
        },
      });

      // Count purchases per trackGroupId from nested trackGroupPurchases arrays
      const counts = new Map<string | number, number>();
      for (const tx of transactions) {
        for (const p of tx.trackGroupPurchases) {
          const id = p.trackGroupId;
          counts.set(id, (counts.get(id) || 0) + 1);
        }
      }

      const topSoldIds = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, take ? Number(take) : undefined)
        .map(([trackGroupId, count]) => ({
          trackGroupId: Number(trackGroupId),
          _count: { trackGroupId: count },
        }));

      const trackGroupIds = topSoldIds.map((item) => item.trackGroupId);

      const trackGroups = await prisma.trackGroup.findMany({
        where: { ...where, id: { in: trackGroupIds } },
        include: {
          _count: {
            select: {
              userTrackGroupPurchases: true,
            },
          },
          artist: {
            select: {
              name: true,
              urlSlug: true,
              id: true,
            },
          },
          tracks: { orderBy: { order: "asc" }, where: { deletedAt: null } },
          cover: true,
        },
      });

      const sortedTrackGroups = trackGroupIds
        .map((id) => trackGroups.find((trackGroup) => trackGroup.id === id))
        .filter(
          (trackGroup): trackGroup is NonNullable<typeof trackGroup> =>
            trackGroup != null
        );

      const purchaseCountMap = new Map(
        topSoldIds.map((item) => [item.trackGroupId, item._count])
      );

      res.json({
        results: sortedTrackGroups.map((tg) => ({
          ...processor.single(tg, {
            loggedInUserId: loggedInUser?.id,
          }),
          purchaseCount: purchaseCountMap.get(tg.id)?.trackGroupId,
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns top sold trackGroups",
    responses: {
      200: {
        description: "A list of trackGroups",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/TrackGroup",
          },
        },
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
