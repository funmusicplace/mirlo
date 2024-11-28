import { NextFunction, Request, Response } from "express";
import {
  merchBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import busboy from "connect-busboy";
import { processPostImage } from "../../../../../queues/processImages";

type Params = {
  postId: number;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      merchBelongsToLoggedInUser,
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
      const imageId = await processPostImage({ req, res })(postId);
      console.log(imageId);
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a post image belonging to a user",
    parameters: [
      {
        in: "path",
        name: "merchId",
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
      200: {
        description: "Updated merch",
        schema: {
          $ref: "#/definitions/Merch",
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
