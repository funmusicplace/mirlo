import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../../../../auth/passport";
import { doesSubscriptionTierBelongToUser } from "../../../../../../../utils/ownership";
import prisma from "../../../../../../../../prisma/prisma";
import logger from "../../../../../../../logger";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
    DELETE: [userAuthenticated, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { subscriptionTierId, userId } = req.params;

    try {
      const subscriptionTier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(userId)
      );

      if (!subscriptionTier) {
        res.status(400).json({
          error: "Subscription must belong to user",
        });
        return next();
      }
      logger.info(`Updating tier ${subscriptionTierId}`);
      const updatedTier = await prisma.artistSubscriptionTier.update({
        where: { id: Number(subscriptionTierId) },
        data: {
          name: req.body.name,
          description: req.body.description,
          allowVariable: req.body.allowVariable,
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
        in: "path",
        name: "userId",
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
      const { userId, subscriptionTierId } = req.params;
      const tier = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(userId)
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
      console.error(
        "delete artist/{artistId}/subscriptionTiers/{subscriptionTierId}",
        e
      );
      res.status(500);
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
      {
        in: "path",
        name: "userId",
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
