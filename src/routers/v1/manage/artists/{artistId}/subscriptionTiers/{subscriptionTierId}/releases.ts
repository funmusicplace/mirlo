import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../../auth/passport";
import { doesSubscriptionTierBelongToUser } from "../../../../../../../utils/ownership";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { AppError } from "../../../../../../../utils/error";

type Params = {
  artistId: string;
  subscriptionTierId: string;
};

type QueryParams = {
  trackGroupId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, artistBelongsToLoggedInUser, POST],
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { subscriptionTierId } = req.params as unknown as Params;
    const user = req.user as User;

    try {
      const subscriptionTier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(user.id)
      );

      if (!subscriptionTier) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription tier not found",
        });
      }

      const releases = await prisma.subscriptionTierRelease.findMany({
        where: {
          tierId: Number(subscriptionTierId),
        },
        include: {
          trackGroup: {
            include: {
              cover: true,
              artist: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      res.status(200).json({ results: releases });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Get releases for a subscription tier",
    parameters: [
      {
        in: "path",
        name: "subscriptionTierId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "List of releases for the subscription tier",
        schema: {
          type: "array",
          items: {
            additionalProperties: true,
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

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { subscriptionTierId } = req.params as unknown as Params;
    const user = req.user as User;
    const { trackGroupId } = req.body;

    try {
      const subscriptionTier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(user.id)
      );

      if (!subscriptionTier) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription tier not found",
        });
      }

      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
      });

      if (!trackGroup) {
        throw new AppError({
          httpCode: 400,
          description:
            "Track group not found or does not belong to this artist",
        });
      }

      const existingRelease = await prisma.subscriptionTierRelease.findUnique({
        where: {
          tierId_trackGroupId: {
            tierId: Number(subscriptionTierId),
            trackGroupId: Number(trackGroupId),
          },
        },
      });

      if (existingRelease) {
        throw new AppError({
          httpCode: 400,
          description:
            "This release is already added to this subscription tier",
        });
      }

      const release = await prisma.subscriptionTierRelease.create({
        data: {
          tierId: Number(subscriptionTierId),
          trackGroupId: Number(trackGroupId),
        },
        include: {
          trackGroup: {
            include: {
              cover: true,
              artist: true,
            },
          },
        },
      });

      res.status(201).json({ result: release });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Add a release to a subscription tier",
    parameters: [
      {
        in: "path",
        name: "subscriptionTierId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "release",
        required: true,
        schema: {
          type: "object",
          properties: {
            trackGroupId: {
              type: "integer",
              description: "ID of the track group (album) to add",
            },
          },
          required: ["trackGroupId"],
        },
      },
    ],
    responses: {
      201: {
        description: "Release added to subscription tier",
        schema: {
          additionalProperties: true,
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
    const { subscriptionTierId } = req.params as unknown as Params;
    const { trackGroupId } = req.query as unknown as QueryParams;
    const user = req.user as User;

    try {
      const subscriptionTier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(user.id)
      );

      if (!subscriptionTier) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription tier not found",
        });
      }

      const release = await prisma.subscriptionTierRelease.findUnique({
        where: {
          tierId_trackGroupId: {
            tierId: Number(subscriptionTierId),
            trackGroupId: Number(trackGroupId),
          },
        },
      });

      if (!release) {
        throw new AppError({
          httpCode: 404,
          description: "Release not found in this subscription tier",
        });
      }

      await prisma.subscriptionTierRelease.delete({
        where: {
          tierId_trackGroupId: {
            tierId: Number(subscriptionTierId),
            trackGroupId: Number(trackGroupId),
          },
        },
      });

      res.json({ message: "Release removed from subscription tier" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Remove a release from a subscription tier",
    parameters: [
      {
        in: "path",
        name: "subscriptionTierId",
        required: true,
        type: "string",
      },
      {
        in: "query",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Release removed successfully",
        schema: {
          additionalProperties: true,
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
