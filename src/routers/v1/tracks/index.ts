import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response) {
    const tracks = await prisma.track.findMany({
      include: {
        trackGroup: {
          include: {
            artist: true,
          },
        },
        audio: true,
      },
    });
    res.json({ results: tracks });
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
