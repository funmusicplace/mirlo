import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { turnItemsIntoRSS } from "../../../utils/rss";
import { processSingleArtist } from "../../../utils/serialize/artist";
import { whereForPublishedTrackGroups } from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { format } = req.query;

    const {
      skip: skipQuery,
      take = format === "rss" ? 50 : 10,
      name,
      orderBy,
      includeUnpublished,
    } = req.query;

    try {
      let where: Prisma.ProfileWhereInput = {
        isLabelProfile: true,
        // Hide labels whose owner has turned off Label/Collective mode (#1804)
        user: { isLabelAccount: true, deletedAt: null },
        deletedAt: null,
      };
      if (!includeUnpublished) {
        where.trackGroups = {
          some: whereForPublishedTrackGroups(),
        };
      }

      if (name && typeof name === "string") {
        where.name = { contains: name, mode: "insensitive" };
      }

      const count = await prisma.profile.count({
        where,
      });

      const orderByClause: Prisma.ProfileOrderByWithRelationInput = {};

      if (orderBy && typeof orderBy === "string") {
        if (orderBy === "name") {
          orderByClause.name = "asc";
        } else if (orderBy === "createdAt") {
          orderByClause.createdAt = "desc";
        }
      }

      const artists = await prisma.profile.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause,
        include: {
          trackGroups: {
            where: whereForPublishedTrackGroups(),
            include: {
              cover: true,
            },
            orderBy: { orderIndex: "asc" },
          },
          avatar: {
            where: {
              deletedAt: null,
            },
          },
          background: {
            where: {
              deletedAt: null,
            },
          },
          user: {
            select: {
              currency: true,
            },
          },
        },
      });

      if (format === "rss") {
        const feed = await turnItemsIntoRSS(
          {
            name: "All Mirlo Releases",
            apiEndpoint: "trackGroups",
            clientUrl: "/releases",
          },
          artists
        );
        res.set("Content-Type", "application/rss+xml");
        res.send(feed.xml());
      } else {
        res.json({
          results: artists.map((artist) => processSingleArtist(artist)),
          total: count,
        });
      }
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all users that are labels",
    responses: {
      200: {
        description: "A list of users",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/User",
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
