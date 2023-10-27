import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../../../../auth/passport";
import { doesSubscriptionTierBelongToUser } from "../../../../../../../utils/ownership";
import prisma from "../../../../../../../../prisma/prisma";

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
        Number(userId),
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
          // TODO: make sure minAmount is alphanumeric
          minAmount: +req.body.minAmount,
        },
      });

      res.json({ result: updatedTier });
    } catch (error) {
      res.status(400);
      res.json({
        error: `Subscription Tier with ID ${subscriptionTierId} does not exist in the database`,
      });
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
          $ref: "#/definitions/ArtistSubscriptionTier",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated subscription",
        schema: {
          $ref: "#/definitions/ArtistSubscriptionTier",
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
      const track = await doesSubscriptionTierBelongToUser(
        Number(subscriptionTierId),
        Number(userId),
      );

      if (!track) {
        res.status(400).json({
          error: "ArtistSubscriptionTier must belong to user",
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
        e,
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
