import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { serializeMerch } from "../../../../serializers/merch";
import {
  findProfileIdForURLSlug,
  whereForVisibleProfile,
} from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import { merchImagesInclude, publicMerchArgs } from "../../../../utils/merch";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;
    const user = req.user;

    try {
      const parsedId = id ? await findProfileIdForURLSlug(id) : undefined;
      const profile = parsedId
        ? await prisma.profile.findFirst({
            where: {
              id: Number(parsedId),
              ...(user?.isAdmin ? {} : whereForVisibleProfile()),
            },
            select: {
              user: { select: { currency: true } },
              merch: {
                ...publicMerchArgs,
                include: {
                  images: merchImagesInclude,
                  includePurchaseTrackGroup: true,
                  optionTypes: { include: { options: true } },
                  shippingDestinations: true,
                },
              },
            },
          })
        : null;

      if (!profile) {
        throw new AppError({ httpCode: 404, description: "Artist not found" });
      }

      res.json({
        results: profile.merch.map((merch) =>
          serializeMerch(merch, {
            fallbackCurrency: profile.user?.currency ?? undefined,
          })
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns an artist's public merch",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
        description: "Artist ID or urlSlug",
      },
    ],
    responses: {
      200: {
        description:
          "Public merch in artist page order, with option types, options and shipping destinations",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                $ref: "#/definitions/Merch",
              },
            },
          },
        },
      },
      404: {
        description: "Artist not found",
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
