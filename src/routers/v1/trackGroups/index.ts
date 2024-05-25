import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import processor, {
  processTrackGroupQueryOrder,
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, orderBy, tag } = req.query;
    const distinctArtists = req.query.distinctArtists === "true";

    try {
      let skip = Number(skipQuery);
      let where: Prisma.TrackGroupWhereInput = whereForPublishedTrackGroups();
      let itemCount = undefined;

      // Note that the distinct query does not support a count
      // https://github.com/prisma/prisma/issues/4228. Though we
      // could probably write a custom query (ditto to random)
      if (!distinctArtists) {
        itemCount = await prisma.trackGroup.count({
          where,
        });
      }

      const orderByClause = processTrackGroupQueryOrder(orderBy);
      if (orderBy === "random") {
        // This isn't ideal, but it'll basically take a random slice
        // anywhere. Prisma does not support random slices.
        skip = Math.max(
          0,
          Math.floor(Math.random() * (itemCount ?? 100)) - Number(take)
        );
      }

      if (tag && typeof tag === "string") {
        where.tags = {
          some: {
            tag: {
              tag: tag,
            },
          },
        };
      }

      const trackGroups = await prisma.trackGroup.findMany({
        where,
        ...(distinctArtists ? { distinct: "artistId" } : {}),
        orderBy: orderByClause,
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          artist: {
            select: {
              name: true,
              urlSlug: true,
              id: true,
            },
          },
          cover: true,
        },
      });
      res.json({
        results: trackGroups.map(processor.single),
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all trackGroups",
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
