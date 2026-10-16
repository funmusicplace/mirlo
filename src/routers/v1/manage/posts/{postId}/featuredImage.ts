import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { userAuthenticated } from "../../../../../auth/passport";
import { serializePost } from "../../../../../serializers/post";
import { doesPostBelongToUser } from "../../../../../utils/post";
import { postImagesForContent } from "../../../../../utils/postContent";

export default function () {
  const operations = {
    PUT: [userAuthenticated, doesPostBelongToUser, PUT],
  };

  async function PUT(req: Request, res: Response) {
    const { postId } = req.params;
    const { featuredImageId } = req.body;

    try {
      const updatedPost = await prisma.post.update({
        where: { id: Number(postId) },
        data: { featuredImageId },
        include: { images: postImagesForContent },
      });
      res.json({
        result: serializePost(updatedPost, undefined, undefined, true),
      });
    } catch (error) {
      throw error;
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
