import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  profileBelongsToLoggedInUser,
  userOrAppAuthenticated,
} from "../../../../../auth/passport";
import { serializeProfileSubscriptionTier } from "../../../../../serializers/profileSubscriptionTier";
import { subscriptionTierOrderBy } from "../../../../../utils/subscriptionTier";

export default function () {
  const operations = {
    PUT: [userOrAppAuthenticated, profileBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params;
    const { tierIds } = req.body as { tierIds: number[] };

    try {
      await prisma.$transaction(
        tierIds.map((tierId, idx) =>
          prisma.profileSubscriptionTier.updateMany({
            where: {
              id: Number(tierId),
              profileId: Number(artistId),
            },
            data: { order: idx + 1 },
          })
        )
      );

      const tiers = await prisma.profileSubscriptionTier.findMany({
        where: {
          profileId: Number(artistId),
          isDefaultTier: false,
          deletedAt: null,
        },
        orderBy: subscriptionTierOrderBy,
      });

      res.status(200).json({
        results: tiers.map((t) => serializeProfileSubscriptionTier(t)),
      });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates the order of subscription tiers",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "tierIds",
        required: true,
        schema: {
          type: "object",
          required: ["tierIds"],
          properties: {
            tierIds: {
              type: "array",
              items: {
                type: "number",
              },
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Updated subscription tiers in their new order",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                $ref: "#/definitions/ArtistSubscriptionTierResult",
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
