import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { processSingleMerch } from "../../../../utils/merch";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const { artistId }: { artistId?: string } = req.query;

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
                artist: {
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
          shippingDestinations: {
            some: {},
          },
        },
        include: {
          artist: { include: { user: { select: { currency: true } } } },
          images: true,
          shippingDestinations: true,
          downloadableContent: {
            include: { downloadableContent: true },
          },
          includePurchaseTrackGroup: {
            include: {
              // Without the trackGroup's own artist the client falls back to
              // `merch.artist` when building the album link — which 404s when a
              // label attaches a roster artist's release to label-owned merch
              // (the URL ends up `/{labelSlug}/release/{trackGroupSlug}` and the
              // trackGroup actually lives under `{rosterArtistSlug}`). See #2008.
              artist: true,
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
