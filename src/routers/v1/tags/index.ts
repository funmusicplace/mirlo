import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import processor, {
  whereForPublishedTrackGroups,
} from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { tag } = req.query;

    try {
      let where: Prisma.TagWhereInput = {};
      if (tag && typeof tag === "string") {
        where.tag = { contains: tag, mode: "insensitive" };
      }

      const tags = await prisma.tag.findMany({
        where,
        orderBy: {
          tag: "asc",
        },
      });
      res.json({
        results: tags,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all tags",
    responses: {
      200: {
        description: "A list of tags",
        schema: {
          type: "array",
          items: {
            type: "object",
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
