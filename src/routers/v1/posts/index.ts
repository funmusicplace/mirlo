import { Request, Response } from "express";
import prisma from "../../../../prisma/prisma";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response) {
    const posts = await prisma.post.findMany({
      where: {
        publishedAt: { lte: new Date() },
      },
      include: {
        artist: true,
      },
    });
    res.json({ results: posts });
  }

  GET.apiDoc = {
    summary: "Returns all published posts",
    responses: {
      200: {
        description: "A list of published posts",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Post",
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
