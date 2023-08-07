import { NextFunction, Request, Response } from "express";
import prisma from "../../../../../prisma/prisma";
import processor, {
  findTrackGroupIdForSlug,
} from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET,
  };

  // FIXME: only do published tracks
  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const { artistId }: { artistId: string } = req.query as {
      artistId: string;
    };
    if (!id) {
      return res.status(400);
    }
    try {
      id = await findTrackGroupIdForSlug(id, artistId);

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
      res.json({ result: processor.single(trackGroup) });
    } catch (e) {
      console.error("trackgroups/{id} GET", e);
      res.status(500);
      res.send({
        error: "Error finding trackGroup",
      });
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
