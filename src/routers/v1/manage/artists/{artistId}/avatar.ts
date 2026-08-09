import { NextFunction, Request, Response } from "express";
import {
  profileBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { processProfileAvatar } from "../../../../../queues/processImages";
import busboy from "connect-busboy";
import prisma from "@mirlo/prisma";
import { deleteProfileAvatar } from "../../../../../utils/artist";
import { busboyOptions } from "../../../../../utils/images";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      profileBelongsToLoggedInUser,
      busboy(busboyOptions),
      PUT,
    ],
    DELETE: [userAuthenticated, profileBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { artistId: profileId } = req.params as unknown as Params;

    try {
      const { jobId, imageId } = await processProfileAvatar({ req, res })(
        Number(profileId)
      );

      res.json({ result: { jobId, imageId } });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates an artist avatar belonging to a user",
    parameters: [
      {
        in: "path",
        name: "artistId",
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
        description: "Updated Artist",
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
    const { artistId: profileId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const profile = await prisma.profile.findFirst({
        where: {
          id: Number(profileId),
          userId: loggedInUser.id,
        },
      });

      if (!profile) {
        res.status(400).json({
          error: "artist must belong to user",
        });
        return next();
      }

      await deleteProfileAvatar(profile.id);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  return operations;
}
