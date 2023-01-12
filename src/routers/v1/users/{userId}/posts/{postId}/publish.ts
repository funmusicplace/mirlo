import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export default function () {
  const operations = {
    PUT,
  };

  // FIXME: only allow to publish posts by userId
  async function PUT(req: Request, res: Response) {
    const { postId, userId } = req.params;

    try {
      const postData = await prisma.post.findUnique({
        where: { id: Number(postId) },
        select: {
          published: true,
        },
      });

      const updatedPost = await prisma.post.update({
        where: { id: Number(postId) || undefined },
        data: { published: !postData?.published },
      });
      res.json(updatedPost);
    } catch (error) {
      res.json({
        error: `Post with ID ${postId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Publishes a Post",
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
        description: "Updated post",
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
