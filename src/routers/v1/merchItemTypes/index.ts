import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await prisma.merchItemType.findMany({
        orderBy: { id: "asc" },
      });

      return res.json({ results });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all merch item types",
    responses: {
      200: {
        description: "A list of merch item types",
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
