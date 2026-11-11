import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  fundraiserBelongsToLoggedInUser,
  userOrAppAuthenticated,
} from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";
import { deleteStoredImage } from "../../../../../../utils/images";

type Params = {
  fundraiserId: string;
  fundraiserImageId: string;
};

export default function () {
  const operations = {
    DELETE: [userOrAppAuthenticated, fundraiserBelongsToLoggedInUser, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId, fundraiserImageId } = req.params as unknown as Params;
    try {
      const fundraiserImage = await prisma.fundraiserImage.findFirst({
        where: { id: fundraiserImageId, fundraiserId: Number(fundraiserId) },
        include: { image: true },
      });

      if (!fundraiserImage) {
        throw new AppError({
          httpCode: 404,
          description: "Image not found for this fundraiser",
        });
      }

      await deleteStoredImage(fundraiserImage.image);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes one of a fundraiser's images",
    parameters: [
      {
        in: "path",
        name: "fundraiserId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "fundraiserImageId",
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
