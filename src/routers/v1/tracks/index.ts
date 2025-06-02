import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { userHasPermission } from "../../../auth/passport";
import { addSizesToImage } from "../../../utils/artist";
import { finalCoversBucket } from "../../../utils/minio";

export default function () {
  const operations = {
    GET: [GET, userHasPermission("admin")],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take = 10, title } = req.query;

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
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        where,
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
