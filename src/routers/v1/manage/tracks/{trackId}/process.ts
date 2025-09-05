import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  trackBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { doesTrackBelongToUser } from "../../../../../utils/ownership";
import {
  processTrackAudio,
  startAudioQueueForTrack,
} from "../../../../../queues/processTrackAudio";
import busboy from "connect-busboy";

type Params = {
  trackId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, trackBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackId } = req.params as unknown as Params;
    try {
      const jobId = await startAudioQueueForTrack(Number(trackId));
      res.json({ result: { jobId } });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary:
      "Pings the server to start processing a track's audio. If successful returns with a job id",
    parameters: [
      {
        in: "path",
        name: "trackId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Returns a jobId",
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
