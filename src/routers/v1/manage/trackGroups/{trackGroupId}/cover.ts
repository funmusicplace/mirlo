import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  trackGroupBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";
import busboy from "connect-busboy";
import processTrackGroupCover from "../../../../../utils/processTrackGroupCover";
import { deleteTrackGroupCover } from "../../../../../utils/trackGroup";

type Params = {
  trackGroupId: number;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      trackGroupBelongsToLoggedInUser,
      busboy({
        highWaterMark: 2 * 1024 * 1024,
        limits: {
          fileSize: 15 * 1024 * 1024,
        },
      }),
      PUT,
    ],
    DELETE: [userAuthenticated, trackGroupBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;
    try {
      await doesTrackGroupBelongToUser(Number(trackGroupId), loggedInUser);

      const jobId = await processTrackGroupCover({ req, res })(
        Number(trackGroupId)
      );

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
        name: "trackGroupId",
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;
    try {
      const trackgroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );

      await deleteTrackGroupCover(trackgroup.id);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  return operations;
}
