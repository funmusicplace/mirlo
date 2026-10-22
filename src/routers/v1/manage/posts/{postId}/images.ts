import prisma from "@mirlo/prisma";
import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userOrAppAuthenticated,
} from "../../../../../auth/passport";
import { processPostImage } from "../../../../../queues/processImages";
import { AppError } from "../../../../../utils/error";
import { generateFullStaticImageUrl } from "../../../../../utils/images";
import { postImagePrefix } from "../../../../../utils/minio";
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
      const images = await prisma.postImage.findMany({
        where: {
          postId: Number(postId),
          deletedAt: null,
        },
        include: {
          featuredForPost: true,
        },
      });

      res.json({
        results: images.map((image) => ({
          ...image,
          src: generateFullStaticImageUrl(
            image.id,
            postImagePrefix,
            image.extension
          ),
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
      const image = await prisma.postImage.findFirst({
        where: {
          id: imageId as string,
        },
      });
      if (!image) {
        throw new AppError({ httpCode: 404, description: "Image not found" });
      }
      const src = generateFullStaticImageUrl(
        image.id,
        postImagePrefix,
        image.extension
      );
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
