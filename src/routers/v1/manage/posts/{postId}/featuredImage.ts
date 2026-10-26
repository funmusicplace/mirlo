import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userOrAppAuthenticated } from "../../../../../auth/passport";
import { serializePost } from "../../../../../serializers/post";
import { AppError } from "../../../../../utils/error";
import { doesPostBelongToUser } from "../../../../../utils/post";
import { postImagesForContent } from "../../../../../utils/postContent";

export default function () {
  const operations = {
    PUT: [userOrAppAuthenticated, doesPostBelongToUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { postId } = req.params;
    const { featuredImageId } = req.body;

    try {
      if (featuredImageId) {
        const postImage = await prisma.postImage.findFirst({
          where: { imageId: featuredImageId, postId: Number(postId) },
        });
        if (!postImage) {
          throw new AppError({
            httpCode: 404,
            description: "Image not found for this post",
          });
        }
      }

      const updatedPost = await prisma.post.update({
        where: { id: Number(postId) },
        data: { featuredImageId },
        include: { images: postImagesForContent },
      });
      res.json({
        result: serializePost(updatedPost, undefined, undefined, true),
      });
    } catch (error) {
      next(error);
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
      404: { description: "Image not found for this post" },
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
