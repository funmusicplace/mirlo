import prisma from "@mirlo/prisma";
import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userOrAppAuthenticated,
} from "../../../../../auth/passport";
import { processPostImage } from "../../../../../queues/processImages";
import { AppError } from "../../../../../utils/error";
import { storedImageFileUrl } from "../../../../../utils/images";
import { doesPostBelongToUser } from "../../../../../utils/post";

type Params = {
  postId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, doesPostBelongToUser, GET],
    PUT: [
      userOrAppAuthenticated,
      doesPostBelongToUser,
      busboy({
        highWaterMark: 2 * 1024 * 1024,
        limits: {
          fileSize: 15 * 1024 * 1024,
        },
      }),
      PUT,
    ],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { postId }: { postId?: string } = req.params;

    try {
      const postImages = await prisma.postImage.findMany({
        where: {
          postId: Number(postId),
          deletedAt: null,
        },
        include: {
          image: { include: { featuredForPost: true } },
        },
      });

      res.json({
        results: postImages.map(({ image, postId }) => ({
          ...image,
          postId,
          src: storedImageFileUrl(image),
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { postId } = req.params as unknown as Params;
    try {
      const { imageId } = await processPostImage({ req, res })(Number(postId));
      const image = await prisma.image.findFirst({
        where: {
          id: imageId,
        },
      });
      if (!image) {
        throw new AppError({ httpCode: 404, description: "Image not found" });
      }
      const src = storedImageFileUrl(image);
      res.json({
        result: {
          src,
          jobId: src,
          imageId: image.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a post image belonging to a user",
    parameters: [
      {
        in: "path",
        name: "postId",
        required: true,
        type: "string",
      },
      {
        in: "formData",
        name: "file",
        type: "file",
        required: true,
        description: "The image to upload",
      },
    ],
    responses: {
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
