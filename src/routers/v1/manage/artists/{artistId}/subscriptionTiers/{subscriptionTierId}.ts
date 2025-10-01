import { User } from "@mirlo/prisma/client";

import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { doesSubscriptionTierBelongToUser } from "../../../../../../utils/ownership";
import prisma from "@mirlo/prisma";
import { getSiteSettings } from "../../../../../../utils/settings";

export default function () {
  const operations = {
    PUT: [userAuthenticated, artistBelongsToLoggedInUser, PUT],
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId, subscriptionTierId } = req.params;
    const user = req.user as User;

    try {
      const subscriptionTier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(user.id)
      );

      return res.json({
        result: subscriptionTier,
      });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Returns artist subscription tier for id",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "An subscription tier that is the artists drafts album",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { subscriptionTierId } = req.params;
    const user = req.user as User;

    try {
      const subscriptionTier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(user.id)
      );

      const artist = await prisma.artist.findFirst({
        where: { id: subscriptionTier?.artistId },
        select: { defaultPlatformFee: true },
      });

      if (!subscriptionTier) {
        res.status(400).json({
          error: "Subscription must belong to user",
        });
        return next();
      }

      const updatedTier = await prisma.artistSubscriptionTier.update({
        where: { id: Number(subscriptionTierId) },
        data: {
          name: req.body.name,
          description: req.body.description,
          allowVariable: req.body.allowVariable,
          interval: req.body.interval ?? "MONTH",
          collectAddress: req.body.collectAddress ?? false,
          platformPercent:
            Number(req.body.platformPercent) ??
            artist?.defaultPlatformFee ??
            (await getSiteSettings()).platformPercent,
          // TODO: make sure minAmount is alphanumeric
          minAmount: +req.body.minAmount,
          autoPurchaseAlbums: !!req.body.autoPurchaseAlbums,
        },
      });

      if (req.body.imageId) {
        await prisma.subscriptionTierImage.deleteMany({
          where: {
            tierId: updatedTier.id,
          },
        });
        await prisma.subscriptionTierImage.create({
          data: {
            imageId: req.body.imageId,
            tierId: updatedTier.id,
          },
        });
      }

      res.json({ result: updatedTier });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a subscription tier belonging to a user",
    parameters: [
      {
        in: "path",
        name: "subscriptionTierId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "subscription",
        schema: {
          $ref: "#/definitions/ArtistSubscriptionTierUpdate",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated subscription",
        schema: {
          $ref: "#/definitions/ArtistSubscriptionTierResult",
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
    try {
      const { subscriptionTierId } = req.params;
      const user = req.user as User;

      const tier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(user.id)
      );

      if (!tier) {
        res.status(400).json({
          error: "ArtistSubscriptionTier must belong to user",
        });
        return next();
      }

      if (tier.isDefaultTier) {
        res.status(400).json({
          error: "Can't delete the default tier",
        });
        return next();
      }
      await prisma.artistSubscriptionTier.delete({
        where: {
          id: Number(subscriptionTierId),
        },
      });
      res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a ArtistSubscriptionTier",
    parameters: [
      {
        in: "path",
        name: "subscriptionTierId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "artistId",
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
