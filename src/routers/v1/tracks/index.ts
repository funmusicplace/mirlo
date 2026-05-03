import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { userHasPermission } from "../../../auth/passport";
import { addSizesToImage } from "../../../utils/artist";
import { finalCoversBucket } from "../../../utils/minio";
import { turnItemsIntoRSS } from "../../../utils/rss";
import { whereForPublishedTrackGroups } from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [GET, userHasPermission("admin")],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { format } = req.query;
    const { skip: skipQuery, take = format === "rss" ? 50 : 10, title } =
      req.query;

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

      const tracks = await prisma.track.findMany({
        include: {
          trackGroup: {
            include: {
              artist: true,
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
          trackGroup: {
            ...tr.trackGroup,
            cover: addSizesToImage(finalCoversBucket, tr.trackGroup.cover),
          },
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
