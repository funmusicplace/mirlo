import { Request, Response, NextFunction } from "express";
import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { query } = req.query;

    try {
      let where: Prisma.LocationTagWhereInput | undefined;

      if (typeof query === "string" && query.trim().length > 0) {
        where = {
          OR: [
            {
              city: {
                contains: query.trim(),
                mode: "insensitive",
              },
            },
            {
              region: {
                contains: query.trim(),
                mode: "insensitive",
              },
            },
            {
              country: {
                contains: query.trim(),
                mode: "insensitive",
              },
            },
          ],
        };
      }

      const locationTags = await prisma.locationTag.findMany({
        where,
        orderBy: [{ country: "asc" }, { region: "asc" }, { city: "asc" }],
      });

      res.json(locationTags);
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Get available location tags",
    tags: ["Location Tags"],
    parameters: [
      {
        in: "query",
        name: "query",
        required: false,
        type: "string",
        description:
          "Optional search text to match against city, region, or country",
      },
    ],
    responses: {
      200: {
        description: "List of all location tags",
        schema: {
          type: "array",
          items: {
            type: "object",
          },
        },
      },
    },
  };

  return operations;
}
