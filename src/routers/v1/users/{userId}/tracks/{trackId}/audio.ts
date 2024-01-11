import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";
import { doesTrackBelongToUser } from "../../../../../../utils/ownership";
import { processTrackAudio } from "../../../../../../utils/processTrackAudio";
import busboy from "connect-busboy";

type Params = {
  trackId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      userHasPermission("owner"),
      busboy({
        highWaterMark: 2 * 1024 * 1024,
        limits: {
          fileSize: 4 * 1024 * 1024 * 1024,
        },
      }),
      PUT,
    ],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;
    try {
      const track = doesTrackBelongToUser(Number(trackId), loggedInUser.id);

      if (!track) {
        res.status(400).json({
          error: "Track must belong to user",
        });
        return next();
      }

      const jobId = await processTrackAudio({ req, res })(Number(trackId));

      res.json({ result: { jobId } });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a trackGroup cover belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackId",
        required: true,
        type: "string",
      },
      {
        in: "formData",
        name: "file",
        type: "file",
        required: true,
        description: "The cover to upload",
      },
    ],
    responses: {
      200: {
        description: "Updated trackgroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
