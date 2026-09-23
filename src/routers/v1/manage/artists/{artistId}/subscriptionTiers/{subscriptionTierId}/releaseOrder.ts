import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../../../auth/getLoggedInUser";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../../auth/passport";
import { processSingleTrackGroup } from "../../../../../../../serializers/trackGroup";
import { AppError } from "../../../../../../../utils/error";
import { doesSubscriptionTierBelongToUser } from "../../../../../../../utils/ownership";
import { subscriptionTierReleasesCount } from "../../../../../../../utils/trackGroup";

type Params = {
  subscriptionTierId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, artistBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { subscriptionTierId } = req.params as unknown as Params;
    const { trackGroupIds } = req.body as { trackGroupIds: number[] };
    assertLoggedIn(req);

    try {
      const subscriptionTier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        req.user
      );

      if (!subscriptionTier) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription tier not found",
        });
      }

      await prisma.$transaction(
        trackGroupIds.map((trackGroupId, idx) =>
          prisma.subscriptionTierRelease.updateMany({
            where: {
              tierId: Number(subscriptionTierId),
              trackGroupId: Number(trackGroupId),
            },
            data: { order: idx + 1 },
          })
        )
      );

      const releases = await prisma.subscriptionTierRelease.findMany({
        where: {
          tierId: Number(subscriptionTierId),
          trackGroup: { deletedAt: null },
        },
        include: {
          trackGroup: {
            include: {
              cover: true,
              profile: true,
              _count: subscriptionTierReleasesCount,
            },
          },
        },
        orderBy: [
          { order: { sort: "asc", nulls: "last" } },
          { trackGroup: { releaseDate: "desc" } },
        ],
      });

      res.status(200).json({
        results: releases.map((release) => ({
          ...release,
          trackGroup: processSingleTrackGroup(release.trackGroup),
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary:
      "Updates the order of the releases included in a subscription tier",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "subscriptionTierId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "trackGroupIds",
        required: true,
        schema: {
          type: "object",
          required: ["trackGroupIds"],
          properties: {
            trackGroupIds: {
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
        description: "The releases of the tier in their new order",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
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
