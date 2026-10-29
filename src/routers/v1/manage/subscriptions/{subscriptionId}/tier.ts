import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { siteUserAuthenticated } from "../../../../../auth/passport";
import { serializeProfileUserSubscription } from "../../../../../serializers/profileUserSubscription";
import { AppError } from "../../../../../utils/error";
import { switchSubscriptionTier } from "../../../../../utils/payments/subscription";

export default function () {
  const operations = {
    PUT: [siteUserAuthenticated, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { subscriptionId } = req.params;
    const tierId = Number(req.body?.tierId);
    assertLoggedIn(req);

    try {
      if (!tierId) {
        throw new AppError({
          httpCode: 400,
          description: "tierId is required",
        });
      }

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

      const updated = await switchSubscriptionTier(subscription, tierId);

      res.status(200).json({
        result: serializeProfileUserSubscription(updated),
      });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Move one of the user's own paid subscriptions to another tier",
    description:
      "Reprices the subscription's existing Stripe subscription at the new " +
      "tier's price. Between tiers with the same interval the new price " +
      "applies from the next bill; a change between monthly and yearly is " +
      "billed now, with credit for the time already paid for. Only " +
      "available while signed in on the site.",
    parameters: [
      {
        in: "path",
        name: "subscriptionId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "body",
        required: true,
        schema: {
          type: "object",
          required: ["tierId"],
          properties: {
            tierId: { type: "number" },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "The subscription, now on the new tier",
      },
      400: {
        description:
          "Already on that tier, not a paid subscription, or the tier needs a shipping address that isn't on file",
      },
      401: { description: "Not logged in" },
      403: { description: "Called with an app's access token" },
      404: {
        description:
          "Subscription or tier not found, or the subscription isn't the logged-in user's",
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
