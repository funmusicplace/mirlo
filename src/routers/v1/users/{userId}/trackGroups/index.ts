import { Prisma, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
    POST,
  };

  async function GET(req: Request, res: Response) {
    const { artistId } = req.query;

    let where: Prisma.TrackGroupWhereInput = {};
    if (artistId) {
      where.artistId = Number(artistId);
    }
    const results = await prisma.trackGroup.findMany({
      where,
      include: {
        tracks: true,
      },
    });
    res.json(results);
  }

  GET.apiDoc = {
    summary: "Get all trackgroups belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "number",
      },
      {
        in: "query",
        name: "artistId",
        type: "number",
      },
    ],
    responses: {
      200: {
        description: "Created trackgroup",
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

  async function POST(req: Request, res: Response) {
    const { title, about, artistId, published, releaseDate, enabled } =
      req.body;
    const result = await prisma.trackGroup.create({
      data: {
        title,
        about,
        artist: { connect: { id: artistId } },
        published,
        releaseDate: new Date(releaseDate),
        enabled,
      },
    });
    res.json(result);
  }

  POST.apiDoc = {
    summary: "Creates a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "trackGroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
        },
      },
    ],
    responses: {
      200: {
        description: "Created trackgroup",
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
