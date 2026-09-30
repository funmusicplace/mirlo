import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { cancelUserSubscription } from "../../../../utils/payments/subscription";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    DELETE: [userAuthenticated, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { id: profileId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const loggedInUser = req.user;
    const keepFollowing = Boolean(req.body?.keepFollowing);
    const tierId = req.body?.tierId ? Number(req.body.tierId) : undefined;

    try {
      const subscription = await prisma.profileUserSubscription.findFirst({
        where: {
          profileSubscriptionTier: { profileId: Number(profileId) },
          userId: loggedInUser.id,
          deletedAt: null,
          ...(tierId ? { profileSubscriptionTierId: tierId } : {}),
        },
        include: {
          profileSubscriptionTier: true,
        },
        orderBy: { stripeSubscriptionKey: { sort: "desc", nulls: "last" } },
      });
      if (!subscription) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription not found",
        });
      }

      await cancelUserSubscription(
        subscription,
        loggedInUser.email,
        keepFollowing
      );

      res.status(200).json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Cancels a user's subscription to an artist",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "cancel",
        schema: {
          type: "object",
          properties: {
            keepFollowing: {
              type: "boolean",
              description:
                "If true, once the paid period ends the user is downgraded to the artist's free tier instead of removed, so they keep following without further billing.",
            },
            tierId: {
              type: "number",
              description:
                "The id of the subscription tier being cancelled. Disambiguates which of the user's subscription rows for this artist to cancel, in case they have more than one (e.g. a free follow tier alongside a paid tier).",
            },
          },
        },
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
