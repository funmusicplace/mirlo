import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { getPaymentProcessor } from "../../../../utils/payments/PaymentProcessor";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { stripeAccountId } = req.query as { stripeAccountId?: string };

    try {
      if (!id) {
        throw new AppError({ httpCode: 400, description: "id is required" });
      }
      if (!stripeAccountId) {
        throw new AppError({
          httpCode: 400,
          description: "stripeAccountId query param is required",
        });
      }

      const { profileId, ...intent } = await getPaymentProcessor().getStatus({
        id,
        accountId: stripeAccountId,
      });

      // Surface a name so the hosted checkout page can show who's being paid.
      let artistName: string | null = null;
      if (profileId) {
        const artist = await prisma.profile.findFirst({
          where: { id: Number(profileId) },
          select: { name: true },
        });
        artistName = artist?.name ?? null;
      }

      res.status(200).json({ result: { ...intent, artistName } });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Poll the status of a pending purchase",
    description:
      "Works for both PaymentIntent IDs (pi_*) from one-time terminal payments and SetupIntent IDs (seti_*) from terminal subscription sign-ups.",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
        description: "PaymentIntent ID (pi_*) or SetupIntent ID (seti_*)",
      },
      {
        in: "query",
        name: "stripeAccountId",
        required: true,
        type: "string",
        description: "Profile's connected Stripe account ID",
      },
    ],
    responses: {
      200: {
        description: "Current intent status",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                id: { type: "string" },
                status: {
                  type: "string",
                  enum: [
                    "requires_payment_method",
                    "requires_confirmation",
                    "requires_action",
                    "processing",
                    "succeeded",
                    "canceled",
                  ],
                },
                clientSecret: {
                  type: "string",
                  description:
                    "Intent client secret — pass to Stripe.js on the hosted checkout page.",
                },
                successUrl: {
                  type: "string",
                  description:
                    "Where the hosted checkout page should send the buyer after payment, if one was supplied at initiation.",
                },
                amount: {
                  type: "number",
                  description:
                    "Total in the smallest currency unit (e.g. cents). Null for SetupIntents.",
                },
                currency: {
                  type: "string",
                  description: "ISO currency code. Null for SetupIntents.",
                },
                artistName: {
                  type: "string",
                  description:
                    "Name of the artist being paid, for display on the checkout page.",
                },
              },
            },
          },
        },
      },
      400: { description: "Missing parameters" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
