import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import processor, {
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { take = 50, datePurchased } = req.query;
    try {
      let where: Prisma.TrackGroupWhereInput = whereForPublishedTrackGroups();
      let topWhere: Prisma.UserTrackGroupPurchaseWhereInput = {
        trackGroup: whereForPublishedTrackGroups(),
      };

      if (datePurchased === "thisMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        topWhere.datePurchased = {
          gte: startOfMonth.toISOString(),
        };
      }

      console.log("topWhere:", topWhere);

      const topSoldIds = await prisma.userTrackGroupPurchase.groupBy({
        by: ["trackGroupId"],
        where: topWhere,
        _count: {
          trackGroupId: true,
        },
        orderBy: {
          _count: {
            trackGroupId: "desc",
          },
        },
        take: take ? Number(take) : undefined,
      });

      const trackGroupIds = topSoldIds.map((item) => item.trackGroupId);
      console.log("topSoldIds:", trackGroupIds);

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
          ...processor.single(tg),
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
