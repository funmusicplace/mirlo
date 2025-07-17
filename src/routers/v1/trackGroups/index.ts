import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import processor, {
  processTrackGroupQueryOrder,
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";
import { turnItemsIntoRSS } from "../../../utils/rss";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { format } = req.query;

    const {
      skip: skipQuery,
      take = format === "rss" ? 50 : 10,
      orderBy,
      tag,
      artistId,
      title,
      isReleased,
    } = req.query;
    const distinctArtists = req.query.distinctArtists === "true";

    try {
      let skip = Number(skipQuery);
      let where: Prisma.TrackGroupWhereInput = whereForPublishedTrackGroups();
      let itemCount = undefined;

      if (tag && typeof tag === "string") {
        where.tags = {
          some: {
            tag: {
              tag: tag,
            },
          },
        };
      }

      if (isReleased === "released") {
        where.releaseDate = {
          lte: new Date(),
        };
      } else if (isReleased === "not-released") {
        where.releaseDate = {
          gt: new Date(),
        };
      }

      if (artistId) {
        where.artistId = Number(artistId);
      }

      if (title && typeof title === "string") {
        where.title = {
          contains: title,
          mode: "insensitive",
        };
      }

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
        const rawTrackGroups = await prisma.$queryRaw<Array<{ id: number }>>`
              SELECT id FROM (
              SELECT DISTINCT ON ("artistId") id
              FROM "TrackGroup"
              WHERE "releaseDate" <= NOW()
                AND "releaseDate" >= NOW() - INTERVAL '3 months'
                AND "published" = true
                AND "adminEnabled" = true
                and exists (
                	select id from "Track" t	
                	where t."trackGroupId" = "TrackGroup".id
                	and t."deletedAt" is null
                	and exists (
                		select id from "TrackAudio" ta
						        where ta."deletedAt" is null
                		)
                )
              ORDER BY "artistId", "releaseDate" DESC
            ) AS distinct_groups
          ORDER BY RANDOM()
          LIMIT ${Number(take)}
        `;

        const randomIds = rawTrackGroups.map((row) => row.id);
        where.id = { in: randomIds };
        delete where.releaseDate; // Remove releaseDate filter for random query
        delete where.tags;
        delete where.artistId; // Remove artistId filter for random query
        delete where.title;
      }

      const trackGroups = await prisma.trackGroup.findMany({
        where,
        ...(distinctArtists ? { distinct: "artistId" } : {}),
        orderBy: where.id ? undefined : orderByClause,
        skip: skip && !where.id ? Number(skip) : undefined,
        take: take && !where.id ? Number(take) : undefined,
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

      if (format === "rss") {
        const feed = await turnItemsIntoRSS(
          {
            name: tag ? `All Mirlo Releases for ${tag}` : "All Mirlo Releases",
            apiEndpoint: "trackGroups",
            description: "Mirlo's most recent releases",
            clientUrl: "releases",
          },
          trackGroups
        );
        res.set("Content-Type", "application/rss+xml");
        res.send(feed.xml());
      } else {
        res.json({
          results: trackGroups.map(processor.single),
          total: itemCount,
        });
      }
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
