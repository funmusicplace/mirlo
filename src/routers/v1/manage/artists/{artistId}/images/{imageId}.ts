import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  profileBelongsToLoggedInUser,
  userOrAppAuthenticated,
} from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";
import { deleteStoredImage } from "../../../../../../utils/images";

type Params = {
  artistId: string;
  imageId: string;
};

export default function () {
  const operations = {
    DELETE: [userOrAppAuthenticated, profileBelongsToLoggedInUser, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { artistId: profileId, imageId } = req.params as unknown as Params;

    try {
      const image = await prisma.image.findFirst({
        where: { id: imageId, profileId: Number(profileId) },
      });

      if (!image) {
        throw new AppError({
          httpCode: 404,
          description: "Image not found for this artist",
        });
      }

      await deleteStoredImage(image);

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
