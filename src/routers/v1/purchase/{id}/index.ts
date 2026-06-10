import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { getIntentStatus } from "../../../../utils/stripe/status";

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

      const { id: intentId, status } = await getIntentStatus({
        id,
        stripeAccountId,
      });

      res.status(200).json({ result: { id: intentId, status } });
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
        description: "Artist's connected Stripe account ID",
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
