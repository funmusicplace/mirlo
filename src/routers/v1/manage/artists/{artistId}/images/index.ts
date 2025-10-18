import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { uploadAndSendToImageQueue } from "../../../../../../queues/processImages";
import busboy from "connect-busboy";
import { User } from "@mirlo/prisma/client";
import prisma from "@mirlo/prisma";
import { deleteArtistAvatar } from "../../../../../../utils/artist";
import { busboyOptions } from "../../../../../../utils/images";
import {
  finalImageBucket,
  incomingImageBucket,
} from "../../../../../../utils/minio";
import { logger } from "../../../../../../logger";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      artistBelongsToLoggedInUser,
      busboy(busboyOptions),
      PUT,
    ],
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as unknown as Params;

    try {
      const { jobId, imageId } = await uploadAndSendToImageQueue(
        { req, res },
        incomingImageBucket,
        "image",
        "inFormData",
        async (
          fileInfo: { filename: string },
          details: {
            dimensions: "square" | "banner";
            imageId?: string;
            relation?: string;
            tierId?: number;
          }
        ) => {
          let image;
          logger.info(`Upserting image for new image ${fileInfo.filename}`);
          if (details.imageId) {
            image = await prisma.image.findUnique({
              where: {
                id: details.imageId,
              },
            });
          }
          if (!image) {
            image = await prisma.image.create({
              data: {
                originalFilename: fileInfo.filename,
                dimensions: details.dimensions,
              },
            });
          }
          logger.info("Done upserting image, id: " + image.id);
          return image;
        },
        finalImageBucket
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
        res.status(400).json({
          error: "artist must belong to user",
        });
        return next();
      }

      await deleteArtistAvatar(artist.id);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  return operations;
}
