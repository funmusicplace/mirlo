import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import processor from "../trackGroups/processor";

const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response) {
    const { id }: { id?: string } = req.params;

    const artist = await prisma.artist.findFirst({
      where: { id: Number(id), enabled: true },
      include: {
        trackGroups: {
          where: {
            published: true,
            releaseDate: {
              lte: new Date(),
            },
          },
          include: {
            tracks: true,
            cover: true,
          },
        },
        subscriptionTiers: true,
        posts: {
          where: {
            publishedAt: {
              lte: new Date(),
            },
          },
        },
      },
    });
    res.json({
      result: {
        ...artist,
        trackGroups: artist?.trackGroups.map(processor.single),
      },
    });
  }

  GET.apiDoc = {
    summary: "Returns Artist information",
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
        description: "An artist that matches the id",
        schema: {
          $ref: "#/definitions/Artist",
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
