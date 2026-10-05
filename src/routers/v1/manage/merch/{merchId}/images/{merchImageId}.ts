import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  merchBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";
import { deleteMerchImage } from "../../../../../../utils/merch";

type Params = {
  merchId: string;
  merchImageId: string;
};

export default function () {
  const operations = {
    DELETE: [userAuthenticated, merchBelongsToLoggedInUser, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { merchId, merchImageId } = req.params as unknown as Params;
    try {
      const merchImage = await prisma.merchImage.findFirst({
        where: { id: merchImageId, merchId },
        include: { image: true },
      });

      if (!merchImage) {
        throw new AppError({
          httpCode: 404,
          description: "Image not found for this merch",
        });
      }

      await deleteMerchImage(merchImage);

      res.json({ message: "Success" });
    } catch (error) {
      next(error);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes one of a merch item's images",
    parameters: [
      {
        in: "path",
        name: "merchId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "merchImageId",
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
