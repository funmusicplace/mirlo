import { NextFunction, Request, Response } from "express";
import busboy from "connect-busboy";
import {
  profileBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { processProfileBackground } from "../../../../../queues/processImages";
import prisma from "@mirlo/prisma";
import { deleteProfileBackground } from "../../../../../utils/artist";
import { AppError } from "../../../../../utils/error";
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
      const { jobId, imageId } = await processProfileBackground({ req, res })(
        Number(profileId)
      );

      res.json({ result: { jobId, imageId } });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates an artist background belonging to a user",
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
        description: "The background image to upload",
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
        throw new AppError({ description: "Artist not found", httpCode: 404 });
      }

      await deleteProfileBackground(profile.id);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes an artist background belonging to a user",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
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

  return operations;
}
