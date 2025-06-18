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
      const trackGroups = await prisma.trackGroup.findMany({
        where,
        select: {
          id: true,
          tracks: {
            select: {
              plays: true,
            },
          },
        },
      });

      const idsToPlayCount = trackGroups.map((tg) => {
        const idPlayPair = [
          tg.id,
          tg.tracks.reduce((total, track) => total + track.plays.length, 0),
        ];
        return idPlayPair;
      });

      const topTrackGroupIds = idsToPlayCount
        .sort((a, b) => b[1] - a[1])
        .slice(0, Number(take))
        .map((tg) => tg[0]);

      const fullTrackGroups = await prisma.trackGroup.findMany({
        where: { ...where, id: { in: topTrackGroupIds } },
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

      const sortedMostPlayedTrackGroups = topTrackGroupIds
        .map((tgId) => fullTrackGroups.find((tg) => tg.id === tgId))
        .filter((tg): tg is NonNullable<typeof tg> => tg !== null);

      const idPlayCountMap = new Map(
        trackGroups.map((tg) => [
          tg.id,
          tg.tracks.reduce((total, track) => total + track.plays.length, 0),
        ])
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
