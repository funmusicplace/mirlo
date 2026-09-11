import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  profileBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { logger } from "../../../../../../logger";
import { AppError } from "../../../../../../utils/error";
import {
  finalImageBucket,
  removeObjectsFromBucket,
} from "../../../../../../utils/minio";

type Params = {
  artistId: string;
  imageId: string;
};

export default function () {
  const operations = {
    DELETE: [userAuthenticated, profileBelongsToLoggedInUser, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { artistId: profileId, imageId } = req.params as unknown as Params;

    try {
      const tierImage = await prisma.subscriptionTierImage.findFirst({
        where: {
          imageId,
          tier: { profileId: Number(profileId) },
        },
      });

      if (!tierImage) {
        throw new AppError({
          httpCode: 404,
          description: "Image not found for this artist",
        });
      }

      await prisma.subscriptionTierImage.deleteMany({ where: { imageId } });
      await prisma.image.delete({ where: { id: imageId } });

      try {
        await removeObjectsFromBucket(finalImageBucket, imageId);
      } catch (e) {
        logger.info(`No stored objects for image ${imageId}, that's okay`);
      }

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes an artist image",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "imageId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Deleted image",
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
