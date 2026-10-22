import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import {
  trackBelongsToLoggedInUser,
  userOrAppAuthenticated,
} from "../../../../../auth/passport";
import { processTrackAudio } from "../../../../../queues/processTrackAudio";
import { doesTrackBelongToUser } from "../../../../../utils/ownership";

type Params = {
  trackId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [
      userOrAppAuthenticated,
      trackBelongsToLoggedInUser,
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
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const track = await doesTrackBelongToUser(Number(trackId), loggedInUser);

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
