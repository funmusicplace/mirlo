import { NextFunction, Request, Response } from "express";
import busboy from "connect-busboy";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../auth/passport";
import {
  processArtistBanner,
  processUserBanner,
} from "../../../../queues/processImages";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { deleteArtistBanner } from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import { busboyOptions } from "../../../../utils/images";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, busboy(busboyOptions), PUT],
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const loggedInUser = req.user as User;

    try {
      const { jobId, imageId } = await processUserBanner({ req, res })(
        loggedInUser.id
      );

      res.json({ result: { jobId, imageId } });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a banner for a user",
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
        description: "The banner to upload",
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
    const { artistId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;
    try {
      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
          userId: loggedInUser.id,
        },
      });

      if (!artist) {
        throw new AppError({ description: "Artist not found", httpCode: 404 });
      }

      await deleteArtistBanner(artist.id);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes an artist banner belonging to a user",
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
