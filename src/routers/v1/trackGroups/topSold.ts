import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import processor, {
  processTrackGroupQueryOrder,
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";
import { orderBy } from "lodash";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      let where: Prisma.TrackGroupWhereInput = whereForPublishedTrackGroups();

      const topSoldIds = await prisma.userTrackGroupPurchase.groupBy({
        by: ["trackGroupId"],
        _count: {
          trackGroupId: true,
        },
        orderBy: {
          _count: {
            trackGroupId: "desc",
          },
        },
        take: 50,
      });

      const trackGroupIds = topSoldIds.map((item) => item.trackGroupId);

      const trackGroups = await prisma.findMany({
        where: { ...where, id: { in: trackGroupIds } },
        include: {
          _count: {
            select: {
              userTrackGroupPurchase: true,
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
        .filter(Boolean);

      res.json({
        results: sortedTrackGroups.map(processor.single),
      });
    } catch (e) {
      next(e);
    }
  }
}
