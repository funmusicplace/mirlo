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

      const trackGroups = await prisma.findMany({
        where,
        take: 20,
        include: {
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

      res.json({
        results: trackGroups.map(processor.single),
      });
    } catch (e) {
      next(e);
    }
  }
}
