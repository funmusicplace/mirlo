import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../../../../prisma/prisma";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response) {
    let where: Prisma.ArtistWhereInput = {};

    if (req.query) {
      if (req.query.name && typeof req.query.name === "string") {
        where.name = { contains: req.query.name, mode: "insensitive" };
      }
    }

    const artists = await prisma.artist.findMany({ where });
    res.json({ results: artists });
  }

  GET.apiDoc = {
    summary: "Returns all artists",
    responses: {
      200: {
        description: "A list of artists",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Artist",
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
