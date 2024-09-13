import { NextFunction, Request, Response } from "express";
import {
  merchBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import busboy from "connect-busboy";
import processTrackGroupCover from "../../../../../utils/processTrackGroupCover";
import { deleteMerchCover } from "../../../../../utils/merch";
import { processMerchImage } from "../../../../../queues/processImages";

type Params = {
  merchId: string;
  userId: string;
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
    DELETE: [userAuthenticated, merchBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { merchId } = req.params as unknown as Params;
    try {
      const jobId = await processMerchImage({ req, res })(merchId);

      res.json({ result: { jobId } });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a merch image belonging to a user",
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { merchId } = req.params as unknown as Params;
    try {
      await deleteMerchCover(merchId);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  return operations;
}
