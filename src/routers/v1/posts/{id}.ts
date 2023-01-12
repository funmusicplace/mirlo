import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response) {
    const { id }: { id?: string } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
    });
    res.json(post);
  }

  GET.apiDoc = {
    summary: "Returns Post information",
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
        description: "A post that matches the id",
        schema: {
          $ref: "#/definitions/Post",
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
