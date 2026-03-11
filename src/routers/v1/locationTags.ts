import { Request, Response, NextFunction } from "express";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const locationTags = await prisma.locationTag.findMany({
        orderBy: [{ country: "asc" }, { region: "asc" }, { city: "asc" }],
      });

      res.json(locationTags);
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Get all available location tags",
    tags: ["Location Tags"],
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
