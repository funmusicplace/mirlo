import { Request, Response } from "express";
import processor from "../../../../utils/trackGroup";
import prisma from "../../../../../prisma/prisma";

export default function () {
  const operations = {
    GET,
  };

  // FIXME: only do published tracks
  async function GET(req: Request, res: Response) {
    const { id }: { id?: string } = req.params;

    const track = await prisma.track.findFirst({
      where: { id: Number(id) },
      include: {
        trackGroup: {
          include: {
            artist: true,
            cover: true,
          },
        },
        trackArtists: true,
        audio: true,
      },
    });
    res.json({
      result: {
        ...track,
        trackGroup: track ? processor.single(track.trackGroup) : {},
      },
    });
  }

  GET.apiDoc = {
    summary: "Returns track information",
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
        description: "A track that matches the id",
        schema: {
          $ref: "#/definitions/Track",
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
