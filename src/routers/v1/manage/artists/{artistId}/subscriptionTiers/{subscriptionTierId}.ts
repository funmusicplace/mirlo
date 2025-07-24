import { User } from "@mirlo/prisma/client";

import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../../../auth/passport";
import { doesSubscriptionTierBelongToUser } from "../../../../../../utils/ownership";
import prisma from "@mirlo/prisma";
import logger from "../../../../../../logger";
import { getSiteSettings } from "../../../../../../utils/settings";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
    DELETE: [userAuthenticated, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { subscriptionTierId } = req.params;
    const user = req.user as User;

    try {
      const subscriptionTier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(user.id)
      );

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
            req.body.platformPercent ??
            (await getSiteSettings()).platformPercent,
          // TODO: make sure minAmount is alphanumeric
          minAmount: +req.body.minAmount,
          autoPurchaseAlbums: !!req.body.autoPurchaseAlbums,
        },
      });

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
