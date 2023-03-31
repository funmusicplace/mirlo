import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
  };

  // FIXME: only do published tracks
  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;

    const trackGroup = await prisma.trackGroup.findFirst({
      where: { id: Number(id), published: true },
      include: {
        tracks: true,
        cover: true,
      },
    });

    if (!trackGroup) {
      res.status(404);
      return next();
    }
    res.json({ result: trackGroup });
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
