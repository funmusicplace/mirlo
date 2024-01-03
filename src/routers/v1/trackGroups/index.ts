import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import processor from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip, take } = req.query;

    try {
      const trackGroups = await prisma.trackGroup.findMany({
        where: {
          published: true,
          tracks: { some: { audio: { uploadState: "SUCCESS" } } },
        },
        orderBy: {
          releaseDate: "desc",
        },
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          artist: {
            select: {
              name: true,
              urlSlug: true,
              id: true,
            },
          },
          cover: true,
        },
      });
      res.json({ results: trackGroups.map(processor.single) });
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
