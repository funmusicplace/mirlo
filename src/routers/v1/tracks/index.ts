import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import { Prisma } from "@prisma/client";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, title } = req.query;

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
            },
          },
          audio: true,
        },
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        where,
      });
      res.json({ results: tracks });
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
