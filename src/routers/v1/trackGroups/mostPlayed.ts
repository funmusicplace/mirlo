import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import processor, {
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";
import { tr } from "@faker-js/faker";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { take = 50 } = req.query;
    try {
      let where: Prisma.TrackGroupWhereInput = whereForPublishedTrackGroups();

      // Only get the minimum amount of info needed for calculating total trackPlays across each trackGroup
      const mostPlayedTrackGroups = await prisma.$queryRaw<
        { id: number; total_plays: number }[]
      >`
      SELECT tg.id, COUNT(tp.id)::int AS total_plays
      FROM "TrackGroup" AS tg
      INNER JOIN "Track" AS tr ON tg.id = tr."trackGroupId"
      INNER JOIN "TrackPlay" AS tp ON tr.id = tp."trackId"
      INNER JOIN "TrackGroupCover" AS tgc ON tg.id = tgc."trackGroupId"
      WHERE tg.published = true 
      AND tg."isDrafts" = false 
      AND tg."deletedAt" IS NULL 
      AND tgc.url IS NOT NULL 
      AND array_length(tgc.url, 1) > 0
      AND EXISTS (
        SELECT 1
        FROM "Track" AS t2
        INNER JOIN "TrackAudio" AS ta ON t2.id = ta."trackId"
        WHERE t2."trackGroupId" = tg.id 
        AND ta."uploadState" = 'SUCCESS'
      )
      GROUP BY tg.id
      ORDER BY total_plays DESC 
      LIMIT ${Number(take) || 50}
      `;

      const mostPlayedIds = mostPlayedTrackGroups.map((tg) => tg.id);

      const fullTrackGroups = await prisma.trackGroup.findMany({
        where: { id: { in: mostPlayedIds } },
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

      const sortedMostPlayedTrackGroups = mostPlayedIds
        .map((tgId) => fullTrackGroups.find((tg) => tg.id === tgId))
        .filter((tg): tg is NonNullable<typeof tg> => tg !== null);

      const idPlayCountMap = new Map(
        mostPlayedTrackGroups.map((tg) => [tg.id, tg.total_plays])
      );

      res.json({
        results: sortedMostPlayedTrackGroups.map((tg) => ({
          ...processor.single(tg),
          totalPlaysCount: idPlayCountMap.get(tg.id),
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns most played trackGroups",
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
