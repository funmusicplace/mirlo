import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  profileBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { resolvePayee } from "../../../../../utils/payments/payee";

export default function () {
  const operations = {
    GET: [userAuthenticated, profileBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const profileId = Number(req.params.artistId);
    try {
      const [profile, subscriptions] = await Promise.all([
        prisma.profile.findFirstOrThrow({
          where: { id: profileId },
          select: {
            user: { select: { stripeAccountId: true } },
            paymentToUser: { select: { stripeAccountId: true } },
          },
        }),
        prisma.profileUserSubscription.findMany({
          where: {
            profileSubscriptionTier: { profileId },
            stripeSubscriptionKey: { not: null },
            deleteReason: null,
          },
          select: { stripeAccountId: true },
        }),
      ]);
      const payeeAccountId = resolvePayee({ profile }).stripeAccountId;

      res.json({
        result: {
          paidSubscriptions: subscriptions.length,
          onOtherAccounts: subscriptions.filter(
            (sub) =>
              sub.stripeAccountId && sub.stripeAccountId !== payeeAccountId
          ).length,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Counts an artist's paid subscriptions, and how many pay out to a Stripe account other than the artist's current payee",
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
        description: "Subscription payout counts",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                paidSubscriptions: { type: "integer" },
                onOtherAccounts: { type: "integer" },
              },
            },
          },
        },
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
