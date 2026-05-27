import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { userHasPermission } from "../../../auth/passport";
import { turnItemsIntoRSS } from "../../../utils/rss";
import { processSingleTrackGroup } from "../../../utils/serialize/trackGroup";
import { whereForPublishedTrackGroups } from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [GET, userHasPermission("admin")],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { format } = req.query;
    const {
      skip: skipQuery,
      take = format === "rss" ? 50 : 10,
      title,
      q,
    } = req.query;

    try {
      let where: Prisma.TrackWhereInput = {
        deletedAt: null,
        audio: {
          uploadState: "SUCCESS",
        },
        trackGroup: whereForPublishedTrackGroups(),
      };

      if (title && typeof title === "string") {
        where.title = { contains: title, mode: "insensitive" };
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
              (token): Prisma.TrackWhereInput => ({
                OR: [
                  { title: { contains: token, mode: "insensitive" } },
                  {
                    trackGroup: {
                      artist: {
                        name: { contains: token, mode: "insensitive" },
                      },
                    },
                  },
                ],
              })
            ),
          ];
        }
      }

      const tracks = await prisma.track.findMany({
        include: {
          trackGroup: {
            include: {
              artist: {
                include: {
                  user: {
                    select: {
                      currency: true,
                    },
                  },
                },
              },
              cover: true,
            },
          },
          audio: true,
        },
        // Newest tracks first when serving RSS so subscribers see latest at the
        // top; preserve the existing default ordering for the JSON response.
        orderBy: format === "rss" ? { createdAt: "desc" } : undefined,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        where,
      });

      if (format === "rss") {
        const feed = await turnItemsIntoRSS(
          {
            name: "All Mirlo Tracks",
            apiEndpoint: "tracks",
            description: "Mirlo's most recent tracks",
            clientUrl: "releases",
          },
          tracks
        );
        res.set("Content-Type", "application/rss+xml");
        return res.send(feed.xml());
      }

      res.json({
        results: tracks.map((tr) => ({
          ...tr,
          trackGroup: processSingleTrackGroup(tr.trackGroup, {
            loggedInUserId: req.user?.id,
          }),
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all tracks",
    responses: {
      200: {
        description: "A list of tracks",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Track",
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
