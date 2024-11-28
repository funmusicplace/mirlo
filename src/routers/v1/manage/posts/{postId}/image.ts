import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import busboy from "connect-busboy";
import { processPostImage } from "../../../../../queues/processImages";
import { doesPostBelongToUser } from "../../../../../utils/post";
import { finalPostImageBucket } from "../../../../../utils/minio";
import { generateFullStaticImageUrl } from "../../../../../utils/images";
import prisma from "@mirlo/prisma";

type Params = {
  postId: string;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
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

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { postId } = req.params as unknown as Params;
    try {
      const imageId = await processPostImage({ req, res })(Number(postId));
      const image = await prisma.postImage.findFirst({
        where: {
          id: imageId as string,
        },
      });
      if (image) {
        res.json({
          result: {
            jobId: generateFullStaticImageUrl(
              image.id,
              finalPostImageBucket,
              image.extension
            ),
          },
        });
      }
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
