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

      const topSoldIds = await prisma.userTrackPurchase.groupBy({
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

      const trackIds = topSoldIds.map((item) => item.trackId);

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

      const sortedTracks = topSoldIds
        .map((item) => tracks.find((tr) => tr.id === item.trackId))
        .filter((track): track is NonNullable<typeof track> => track != null);

      res.json({
        results: sortedTracks.map((tr) => ({
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
    summary: "Returns top sold tracks",
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
