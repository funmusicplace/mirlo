import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../../auth/passport";
import { serializeProfileSubscriptionTier } from "../../../../../serializers/profileSubscriptionTier";
import {
  canUserEditProfile,
  findProfileIdForURLSlug,
  subscriptionTierInclude,
  whereForVisibleProfile,
} from "../../../../../utils/artist";
import { AppError } from "../../../../../utils/error";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id, tierId } = req.params as { id: string; tierId: string };
    const user = req.user;

    try {
      const profileId = await findProfileIdForURLSlug(id);
      const numericTierId = Number(tierId);
      const tier = profileId
        ? await prisma.profileSubscriptionTier.findFirst({
            where: {
              isDefaultTier: false,
              profile: {
                id: profileId,
                ...(user?.isAdmin ? {} : whereForVisibleProfile()),
              },
              OR: [
                { urlSlug: { equals: tierId, mode: "insensitive" } },
                ...(Number.isInteger(numericTierId)
                  ? [{ id: numericTierId }]
                  : []),
              ],
            },
            include: subscriptionTierInclude({
              includePrivate: await canUserEditProfile(profileId, user),
              loggedInUserId: user?.id,
            }),
          })
        : null;

      if (!tier) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription tier not found",
        });
      }

      res.json({
        result: serializeProfileSubscriptionTier(tier, {
          loggedInUserId: user?.id,
        }),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns one of an artist's subscription tiers, including tiers hidden from the artist's profile",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
        description: "Artist ID or urlSlug",
      },
      {
        in: "path",
        name: "tierId",
        required: true,
        type: "string",
        description: "Subscription tier ID or urlSlug",
      },
    ],
    responses: {
      200: {
        description: "The subscription tier, with images and releases",
        schema: {
          type: "object",
          properties: {
            result: { $ref: "#/definitions/ArtistSubscriptionTierResult" },
          },
        },
      },
      404: {
        description: "Subscription tier not found",
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
