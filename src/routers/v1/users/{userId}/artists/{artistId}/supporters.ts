import { NextFunction, Request, Response } from "express";

import prisma from "../../../../../../../prisma/prisma";
import { userAuthenticated } from "../../../../../../auth/passport";
import { findArtistIdForURLSlug } from "../../../../../../utils/artist";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { artistId }: { artistId?: string } = req.params;

    try {
      const parsedId = await findArtistIdForURLSlug(artistId);
      const subscriptions = await prisma.artistUserSubscription.findMany({
        where: {
          artistSubscriptionTier: {
            artistId: parsedId,
            deletedAt: null,
          },
          deletedAt: null,
        },
        select: {
          amount: true,
          user: true,
          artistSubscriptionTier: true,
        },
      });

      res.json({
        results: subscriptions,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns an artists subscribers",
    responses: {
      200: {
        description: "A list of artist's subscribers",
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              userId: {
                description: "ID",
                type: "number",
              },
            },
          },
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
