import { Request, Response } from "express";
import prisma from "../../../../../../../prisma/prisma";
import { userAuthenticated } from "../../../../../../auth/passport";
import { doesPostBelongToUser } from "../../../../../../utils/post";

export default function () {
  const operations = {
    PUT: [userAuthenticated, doesPostBelongToUser, PUT],
  };

  // FIXME: only allow to publish posts by userId
  async function PUT(req: Request, res: Response) {
    const { postId, userId } = req.params;

    try {
      const updatedPost = await prisma.post.update({
        where: { id: Number(postId) || undefined },
        data: { publishedAt: new Date() },
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
