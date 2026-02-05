import { Prisma, User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import processor, {
  processTrackGroupQueryOrder,
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";
import { turnItemsIntoRSS } from "../../../utils/rss";
import { set } from "lodash";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { format } = req.query;

    const {
      skip: skipQuery,
      take = format === "rss" ? 50 : 10,
      orderBy,
      tag,
      artistId,
      license,
      title,
      isReleased,
    } = req.query;
    const distinctArtists = req.query.distinctArtists === "true";
    const loggedInUser = req.user as User | null;

    try {
      let skip = Number(skipQuery);
      let where: Prisma.TrackGroupWhereInput = whereForPublishedTrackGroups();
      let itemCount = undefined;

      if (tag && typeof tag === "string") {
        set(where, "tags", {
          some: {
            tag: {
              tag,
            },
          },
        });
      }

      if (isReleased === "released") {
        set(where, "releaseDate", {
          lte: new Date(),
        });
      } else if (isReleased === "not-released") {
        set(where, "releaseDate", {
          gt: new Date(),
        });
      }

      if (artistId) {
        where.artistId = Number(artistId);
      }

      if (license && license !== "" && license !== "all") {
        const licenseOptions = await prisma.license.findMany();
        let ids: (number | null)[] = [];
        if (license === "public-domain") {
          ids = licenseOptions
            .filter(
              (l) =>
                l.short.toLowerCase() === "cc0" ||
                l.short.toLowerCase() === "pd"
            )
            .map((l) => l.id);
          set(where, "tracks.some.licenseId.in", ids);
        } else if (license === "all-rights-reserved") {
          ids = licenseOptions
            .filter(
              (l) =>
                !(
                  l.link?.includes("creativecommons") ||
                  l.short.toLowerCase() === "cc0" ||
                  l.short.toLowerCase() === "pd"
                )
            )
            .map((l) => l.id);
          set(where, "tracks.some.OR", [
            { licenseId: { in: ids } }, // Include tracks with specified licenses
            { licenseId: null }, // Include tracks without a license
          ]);
        } else if (license === "creative-commons") {
          ids = licenseOptions
            .filter((l) => l.link?.includes("creativecommons"))
            .map((l) => l.id);
          set(where, "tracks.some.licenseId.in", ids);
        }
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
                AND "hideFromSearch" = false
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
          LIMIT ${Number(take) * 1.5}
        `;

        const randomIds = rawTrackGroups
          .map((row) => row.id)
          .slice(0, Number(take));
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
              userId: true,
            },
          },
          ...(loggedInUser
            ? {
                userTrackGroupPurchases: {
                  where: { userId: loggedInUser.id },
                  select: { userId: true },
                },
              }
            : {}),
          fundraiser: true,
          tracks: {
            orderBy: { order: "asc" },
            where: { deletedAt: null },
            include: {
              ...(loggedInUser
                ? {
                    userTrackPurchases: {
                      where: { userId: loggedInUser.id },
                      select: { userId: true },
                    },
                  }
                : {}),
            },
          },
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
          results: trackGroups.map((tg) =>
            processor.single(tg, {
              loggedInUserId: loggedInUser?.id,
            })
          ),
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
