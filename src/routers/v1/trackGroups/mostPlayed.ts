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

      const playCountsById = trackGroups.map((tg) => [
        tg.id,
        tg.tracks.reduce((total, track) => total + track.plays.length, 0),
      ]);

      const topTrackGroupIds = playCountsById
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

      res.json({
        results: sortedMostPlayedTrackGroups.map((tg) => ({
          ...processor.single(tg),
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
