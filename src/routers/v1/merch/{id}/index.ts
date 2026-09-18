import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { serializeMerch } from "../../../../serializers/merch";
import { whereForVisibleProfile } from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const { artistId }: { artistId?: string } = req.query;
    const loggedInUser = req.user;

    if (!id) {
      return res.status(400);
    }

    try {
      let merchForURLSlug;
      if (artistId) {
        merchForURLSlug = await prisma.merch.findFirst({
          where: {
            AND: [
              { urlSlug: { equals: id, mode: "insensitive" } },
              {
                profile: {
                  urlSlug: artistId,
                },
              },
            ],
          },
        });
      }
      const merch = await prisma.merch.findFirst({
        where: {
          isPublic: true,
          deletedAt: null,
          id: merchForURLSlug?.id || id,
          ...(loggedInUser?.isAdmin
            ? {}
            : { profile: whereForVisibleProfile() }),
          shippingDestinations: {
            some: {},
          },
        },
        include: {
          profile: { include: { user: { select: { currency: true } } } },
          images: true,
          itemType: true,
          shippingDestinations: true,
          downloadableContent: {
            include: { downloadableContent: true },
          },
          includePurchaseTrackGroup: {
            include: {
              profile: true,
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
      res.json({ result: serializeMerch(merch) });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns Merch information",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
      {
        in: "query",
        name: "artistId",
        required: false,
        type: "string",
        description: "Artist urlSlug to look up merch by urlSlug instead of ID",
      },
    ],
    responses: {
      200: {
        description: "A merch item matching the id",
        schema: {
          $ref: "#/definitions/Merch",
        },
      },
      404: {
        description: "Merch item not found",
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
