import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { set } from "lodash";

import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { turnItemsIntoRSS } from "../../../utils/rss";
import processor, {
  processTrackGroupQueryOrder,
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";

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
      profileId,
      license,
      title,
      locationSlug,
      artistName,
      isReleased,
      q,
    } = req.query;
    const distinctArtists = req.query.distinctArtists === "true";
    const loggedInUser = req.user;

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

      if (profileId) {
        where.profileId = Number(profileId);
      }

      if (locationSlug && typeof locationSlug === "string") {
        if (!where.profile) {
          where.profile = {};
        }
        where.profile.profileLocationTags = {
          some: {
            locationTag: {
              slug: { endsWith: locationSlug },
            },
          },
        };
      }

      if (artistName && typeof artistName === "string") {
        if (!where.profile) {
          where.profile = {};
        }
        where.profile.name = { contains: artistName, mode: "insensitive" };
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

      if (q && typeof q === "string") {
        const tokens = q.split(/\s+/).filter(Boolean);
        if (tokens.length > 0) {
          const existingAnd = where.AND
            ? Array.isArray(where.AND)
              ? where.AND
              : [where.AND]
            : [];
          where.AND = [
            ...existingAnd,
            ...tokens.map(
              (token): Prisma.TrackGroupWhereInput => ({
                OR: [
                  { title: { contains: token, mode: "insensitive" } },
                  {
                    profile: {
                      name: { contains: token, mode: "insensitive" },
                    },
                  },
                ],
              })
            ),
          ];
        }
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
              SELECT DISTINCT ON ("profileId") id
              FROM "TrackGroup"
              WHERE "releaseDate" <= NOW()
                AND "publishedAt" <= NOW()
                AND "adminEnabled" = true
                AND "hideFromSearch" = false
                AND "isPublic" = true
                AND "deletedAt" IS NULL
                AND "isHiddenTrackGroupForSongDrafts" = false
                and exists (
                	select id from "Track" t
                	where t."trackGroupId" = "TrackGroup".id
                	and t."deletedAt" is null
                	and exists (
                		select id from "TrackAudio" ta
						        where ta."deletedAt" is null
                		)
                )
                AND exists (
                  select 1 from "Profile" a
                  where a.id = "TrackGroup"."profileId"
                  and a.enabled = true
                  and a."deletedAt" is null
                  and exists (
                    select 1 from "User" u
                    where u.id = a."userId"
                    and u."canCreateArtists" = true
                    and u."deletedAt" is null
                  )
                )
                AND exists (
                  select 1 from "TrackGroupCover" c
                  where c."trackGroupId" = "TrackGroup".id
                  and cardinality(c.url) > 0
                )
              ORDER BY "profileId", "releaseDate" DESC
            ) AS distinct_groups
          ORDER BY RANDOM()
          LIMIT ${Number(take)}
        `;

        const randomIds = rawTrackGroups.map((row) => row.id);
        where.id = { in: randomIds };
        delete where.releaseDate; // Remove releaseDate filter for random query
        delete where.tags;
        delete where.profileId; // Remove profileId filter for random query
        delete where.title;
      }

      const trackGroups = await prisma.trackGroup.findMany({
        where,
        ...(distinctArtists ? { distinct: "profileId" } : {}),
        orderBy: where.id ? undefined : orderByClause,
        skip: skip && !where.id ? Number(skip) : undefined,
        take: take && !where.id ? Number(take) : undefined,
        include: {
          profile: {
            select: {
              name: true,
              urlSlug: true,
              id: true,
              userId: true,
              user: { select: { currency: true } },
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
