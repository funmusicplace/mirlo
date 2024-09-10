import { NextFunction, Request, Response } from "express";
import { pick } from "lodash";
import {
  merchBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";

import prisma from "@mirlo/prisma";
import { deleteTrackGroup } from "../../../../../utils/trackGroup";
import { AppError } from "../../../../../utils/error";
import { addSizesToImage } from "../../../../../utils/artist";
import { finalMerchImageBucket } from "../../../../../utils/minio";

type Params = {
  merchId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, merchBelongsToLoggedInUser, PUT],
    DELETE: [userAuthenticated, merchBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, merchBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { merchId } = req.params as unknown as Params;

    try {
      const merch = await prisma.merch.findFirst({
        where: {
          id: merchId,
        },
        include: {
          shippingDestinations: true,
          images: true,
          optionTypes: { include: { options: true } },
        },
      });

      if (!merch) {
        throw new AppError({
          httpCode: 404,
          description: "Merch not found",
        });
      }

      return res.status(200).json({
        result: {
          ...merch,
          images: merch.images.map((img) =>
            addSizesToImage(finalMerchImageBucket, img)
          ),
        },
      });
    } catch (e) {
      next(e);
    }
  }

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { merchId } = req.params as unknown as Params;
    const data = req.body;

    try {
      const newValues = pick(data, [
        "title",
        "description",
        "minPrice",
        "quantityRemaining",
        "isPublic",
      ]);

      await prisma.merch.updateMany({
        where: { id: merchId },
        data: newValues,
      });

      let merch = await prisma.merch.findFirst({
        where: { id: merchId },
      });

      res.json({ result: merch });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a merch belonging to a user",
    parameters: [
      {
        in: "path",
        name: "merchId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "merch",
        schema: {
          $ref: "#/definitions/Merch",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated merch",
        schema: {
          $ref: "#/definitions/Merch",
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
    const { trackGroupId } = req.params as {
      trackGroupId: string;
    };
    try {
      await deleteTrackGroup(Number(trackGroupId), true);

      return res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
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
