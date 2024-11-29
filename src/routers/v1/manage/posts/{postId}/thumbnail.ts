import { Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../../../auth/passport";
import { doesPostBelongToUser } from "../../../../../utils/post";

export default function () {
  const operations = {
    PUT: [userAuthenticated, doesPostBelongToUser, PUT],
  };

  async function PUT(req: Request, res: Response) {
    const { postId } = req.params;
    const { thumbnailImageId } = req.body;

    try {
      const updatedPost = await prisma.post.update({
        where: { id: Number(postId) },
        data: { thumbnailImageId },
      });
      res.json(updatedPost);
    } catch (error) {
      res.json({
        error: `Post with ID ${postId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Sets a thumnbail on a post",
    parameters: [
      {
        in: "path",
        name: "postId",
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
