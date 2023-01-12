import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export default function () {
  const operations = {
    DELETE,
    GET,
  };

  // FIXME: only allow delete of posts belonging to user
  async function DELETE(req: Request, res: Response) {
    const { userId, postId } = req.params;
    const post = await prisma.post.delete({
      where: {
        id: Number(postId),
      },
    });
    res.json(post);
  }

  DELETE.apiDoc = {
    summary: "Deletes a Post",
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
        description: "Delete success",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
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
