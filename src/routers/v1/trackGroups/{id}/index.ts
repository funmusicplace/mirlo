import { NextFunction, Request, Response } from "express";
import prisma from "../../../../../prisma/prisma";

export default function () {
  const operations = {
    GET,
  };

  // FIXME: only do published tracks
  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;

    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: { id: Number(id), published: true },
        include: {
          tracks: {
            where: {
              deletedAt: null,
            },
          },
          artist: true,
          cover: true,
        },
      });

      if (!trackGroup) {
        res.status(404);
        return next();
      }
      res.json({ result: trackGroup });
    } catch (e) {
      console.error("trackgroups/{id} GET");
      res.status(500);
    }
  }

  GET.apiDoc = {
    summary: "Returns TrackGroup information",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A trackGroup that matches the id",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
