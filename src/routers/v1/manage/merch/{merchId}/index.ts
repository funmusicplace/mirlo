import { NextFunction, Request, Response } from "express";
import { pick } from "lodash";
import {
  merchBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";

import prisma from "@mirlo/prisma";
import { AppError } from "../../../../../utils/error";
import { deleteMerch, processSingleMerch } from "../../../../../utils/merch";
import slugify from "slugify";

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
          includePurchaseTrackGroup: true,
          downloadableContent: {
            include: {
              downloadableContent: true,
            },
          },
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
        result: processSingleMerch(merch),
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
        "includePurchaseTrackGroupId",
        "urlSlug",
        "catalogNumber",
      ]);
      const merch = await prisma.merch.findFirst({
        where: {
          id: merchId,
        },
      });

      if (newValues.includePurchaseTrackGroupId) {
        // check that the artist who owns this merch also
        // owns this trackgroup

        const trackGroup = await prisma.trackGroup.findFirst({
          where: {
            artistId: merch?.artistId,
            id: Number(newValues.includePurchaseTrackGroupId),
          },
        });

        if (!trackGroup) {
          throw new AppError({
            httpCode: 400,
            description:
              "The includePurchaseTrackGroupId must belong to the merch's artist",
          });
        }
      }

      await prisma.merch.updateMany({
        where: { id: merchId },
        data: {
          ...newValues,
          urlSlug: !merch?.urlSlug // only update slug if it was not set before
            ? slugify(newValues.title ?? merch?.title, {
                strict: true,
                lower: true,
              })
            : undefined,
        },
      });

      const updatedMerch = await prisma.merch.findFirst({
        where: { id: merchId },
        include: {
          includePurchaseTrackGroup: true,
        },
      });

      res.json({ result: updatedMerch });
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
    const { merchId } = req.params as {
      merchId: string;
    };
    try {
      await deleteMerch(merchId);

      return res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a merch belonging to a user",
    parameters: [
      {
        in: "path",
        name: "merchId",
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
