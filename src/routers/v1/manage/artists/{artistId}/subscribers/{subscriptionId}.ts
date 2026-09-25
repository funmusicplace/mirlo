import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { findArtistIdForURLSlug } from "../../../../../../utils/artist";
import { AppError } from "../../../../../../utils/error";
import { cancelUserSubscription } from "../../../../../../utils/payments/subscription";

type Params = {
  artistId: string;
  subscriptionId: string;
};

export default function () {
  const operations = {
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { artistId, subscriptionId } = req.params as unknown as Params;

    try {
      const parsedId = await findArtistIdForURLSlug(artistId);

      if (!parsedId) {
        throw new AppError({ httpCode: 400, description: "Invalid artist id" });
      }

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: {
          id: Number(subscriptionId),
          deletedAt: null,
          profileSubscriptionTier: { profileId: parsedId },
        },
        include: {
          profileSubscriptionTier: true,
          user: { select: { email: true } },
        },
      });

      if (!subscription) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription not found",
        });
      }

      await cancelUserSubscription(
        subscription,
        subscription.user.email,
        false,
        true
      );

      res.status(200).json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Cancels a supporter's subscription to the artist",
    description:
      "Paid subscriptions are set to cancel at the end of the current " +
      "billing period; free subscriptions are removed immediately. The " +
      "supporter is emailed that the artist cancelled it.",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "subscriptionId",
        required: true,
        type: "number",
      },
    ],
    responses: {
      200: {
        description: "Cancelled the subscription",
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
