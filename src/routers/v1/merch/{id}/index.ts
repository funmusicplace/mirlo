import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { processSingleMerch } from "../../../../utils/merch";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;

    if (!id) {
      return res.status(400);
    }

    try {
      const merchForURLSlug = await prisma.merch.findFirst({
        where: {
          urlSlug: id,
        },
      });
      const merch = await prisma.merch.findFirst({
        where: {
          isPublic: true,
          deletedAt: null,
          id: merchForURLSlug?.id || id,
          shippingDestinations: {
            some: {},
          },
        },
        include: {
          artist: true,
          images: true,
          shippingDestinations: true,
          includePurchaseTrackGroup: {
            include: {
              tracks: {
                where: {
                  deletedAt: null,
                  audio: {
                    uploadState: "SUCCESS",
                  },
                },
                orderBy: {
                  order: "asc",
                },
                include: {
                  audio: true,
                  trackArtists: true,
                  license: true,
                },
              },
            },
          },
          optionTypes: { include: { options: true } },
        },
      });

      if (!merch) {
        throw new AppError({
          description: "Merch item not found",
          httpCode: 404,
        });
      }
      res.json({ result: processSingleMerch(merch) });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns TrackGroup information",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A trackGroup that matches the id",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
