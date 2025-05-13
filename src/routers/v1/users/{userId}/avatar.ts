import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../auth/passport";
import { processUserAvatar } from "../../../../queues/processImages";
import busboy from "connect-busboy";
import { User } from "@mirlo/prisma/client";
import prisma from "@mirlo/prisma";
import { deleteArtistAvatar } from "../../../../utils/artist";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      busboy({
        highWaterMark: 2 * 1024 * 1024,
        limits: {
          fileSize: 15 * 1024 * 1024,
        },
      }),
      PUT,
    ],
    DELETE: [userAuthenticated, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const loggedInUser = req.user as User;

    try {
      let jobId = null;
      jobId = await processUserAvatar({ req, res })(Number(loggedInUser.id));

      res.json({ result: { jobId } });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates an avatar for a user profile",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "formData",
        name: "file",
        type: "file",
        required: true,
        description: "The avatar to upload",
      },
    ],
    responses: {
      200: {
        description: "Updated User",
        schema: {
          type: "object",
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
    const loggedInUser = req.user as User;
    try {
      await deleteArtistAvatar(loggedInUser.id);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  return operations;
}
