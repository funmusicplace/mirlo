import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { addSizesToImage } from "../../../utils/artist";
import { finalCoversBucket } from "../../../utils/minio";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { take = 50 } = req.query;

    try {
      let where: Prisma.TrackWhereInput = {
        deletedAt: null,
        audio: {
          uploadState: "SUCCESS",
        },

        trackGroup: {
          deletedAt: null,
          published: true,
          artist: {
            deletedAt: null,
          },
        },
      };

      const mostPlayedIds = await prisma.trackPlay.groupBy({
        by: ["trackId"],
        _count: {
          trackId: true,
        },
        orderBy: {
          _count: {
            trackId: "desc",
          },
        },
        take: take ? Number(take) : undefined,
      });

      const trackIds = mostPlayedIds.map((item) => item.trackId);

      const tracks = await prisma.track.findMany({
        where: { ...where, id: { in: trackIds } },
        include: {
          trackGroup: {
            include: {
              artist: true,
              cover: true,
            },
          },
          audio: true,
        },
      });
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
    summary: "Returns most played tracks",
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
