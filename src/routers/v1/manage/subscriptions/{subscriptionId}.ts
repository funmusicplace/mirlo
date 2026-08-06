import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { initiateSubscriptionPaymentMethodUpdate } from "../../../../utils/payments/subscription";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };

  /**
   * Starts a payment-method update for one of the logged-in user's own paid
   * subscriptions — no cancel + re-subscribe required (see issue #2139).
   * Returns a SetupIntent clientSecret; the frontend confirms it with the
   * shared Purchase machinery, same as a first-time subscription sign-up.
   */
  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { subscriptionId } = req.params;
    assertLoggedIn(req);

    try {
      const subscription = await prisma.profileUserSubscription.findFirst({
        where: {
          id: Number(subscriptionId),
          userId: req.user.id,
          deletedAt: null,
        },
        include: { profileSubscriptionTier: true },
      });

      if (!subscription) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription not found",
        });
      }

      const { clientSecret, stripeAccountId } =
        await initiateSubscriptionPaymentMethodUpdate(subscription);

      res.status(200).json({ result: { clientSecret, stripeAccountId } });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary:
      "Start a payment-method update for one of the user's own subscriptions",
    description:
      "Creates a SetupIntent scoped to the subscription's existing Stripe " +
      "customer. Confirming it (via the shared Purchase machinery, setup " +
      "mode) updates the subscription's default payment method in place — " +
      "no new subscription is created and nothing else about it changes.",
    parameters: [
      {
        in: "path",
        name: "subscriptionId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "SetupIntent created",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                clientSecret: { type: "string" },
                stripeAccountId: { type: "string" },
              },
            },
          },
        },
      },
      400: {
        description:
          "Subscription has no payment method to update (e.g. a free tier)",
      },
      401: { description: "Not logged in" },
      404: {
        description:
          "Subscription not found, or does not belong to the logged-in user",
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
