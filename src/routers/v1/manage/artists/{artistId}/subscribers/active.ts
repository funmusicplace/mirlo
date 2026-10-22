import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../../auth/getLoggedInUser";
import { userAuthenticatedWithScope } from "../../../../../../auth/passport";
import {
  canUserEditProfile,
  findProfileIdForURLSlug,
} from "../../../../../../utils/artist";
import { AppError } from "../../../../../../utils/error";

export default function () {
  const operations = {
    GET: [userAuthenticatedWithScope("subscribers:read"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { paid } = req.query as { paid?: string };
    try {
      assertLoggedIn(req);
      if (paid !== undefined && paid !== "true" && paid !== "false") {
        throw new AppError({
          httpCode: 400,
          description: "paid must be true or false",
        });
      }
      const profileId = await findProfileIdForURLSlug(req.params.artistId);
      if (
        !(await canUserEditProfile(profileId, req.user, { allowAdmin: false }))
      ) {
        throw new AppError({ httpCode: 404, description: "Artist not found" });
      }

      const profile = await prisma.profile.findFirstOrThrow({
        where: { id: profileId },
        select: {
          user: { select: { currency: true } },
          paymentToUser: { select: { currency: true } },
        },
      });
      const currency =
        profile.paymentToUser?.currency ?? profile.user?.currency ?? "usd";

      const subscriptions = await prisma.profileUserSubscription.findMany({
        where: {
          profileSubscriptionTier: {
            profileId,
            deletedAt: null,
            ...(paid === undefined ? {} : { isDefaultTier: paid === "false" }),
          },
          deletedAt: null,
        },
        select: {
          id: true,
          amount: true,
          deleteReason: true,
          nextBillingDate: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { email: true, name: true } },
          profileSubscriptionTier: {
            select: { id: true, name: true, isDefaultTier: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      res.json({
        results: subscriptions.map((sub) => ({
          id: sub.id,
          email: sub.user.email,
          name: sub.user.name,
          tierId: sub.profileSubscriptionTier.id,
          tierName: sub.profileSubscriptionTier.name,
          paid: !sub.profileSubscriptionTier.isDefaultTier,
          amount: sub.amount,
          currency,
          status: sub.deleteReason ? "cancelling" : "active",
          currentPeriodEnd: sub.nextBillingDate,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Lists an artist's current subscribers",
    description:
      "The complete current membership, for syncing to another site. Anyone missing from the list is no longer a subscriber. A `cancelling` subscription is still active until `currentPeriodEnd`. People who only follow the artist are on the free follow tier and have `paid: false`; filter with `?paid=true` or `?paid=false`. Accepts the signed-in session or an OAuth token with the `subscribers:read` scope, for users who can edit the artist.",
    parameters: [
      { in: "path", name: "artistId", required: true, type: "string" },
      {
        in: "query",
        name: "paid",
        required: false,
        type: "string",
        enum: ["true", "false"],
        description:
          "Only paying subscribers (`true`) or only followers (`false`). Leave out for both.",
      },
    ],
    responses: {
      200: {
        description: "The artist's active subscriptions",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  email: { type: "string" },
                  name: { type: "string" },
                  tierId: { type: "number" },
                  tierName: { type: "string" },
                  paid: { type: "boolean" },
                  amount: { type: "number" },
                  currency: { type: "string" },
                  status: { type: "string", enum: ["active", "cancelling"] },
                  currentPeriodEnd: { type: "string" },
                  createdAt: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
      400: { description: "paid isn't true or false" },
      404: { description: "Artist not found or not editable by the user" },
    },
  };

  return operations;
}
