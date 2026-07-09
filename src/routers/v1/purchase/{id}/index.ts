import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  artistEditableByUser,
  userAuthenticated,
  userLoggedInWithoutRedirect,
} from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { getPaymentProcessor } from "../../../../utils/payments/PaymentProcessor";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
    DELETE: [userAuthenticated, DELETE],
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

      const { artistId, ...intent } = await getPaymentProcessor().getStatus({
        id,
        accountId: stripeAccountId,
      });

      // Surface a name so the hosted checkout page can show who's being paid.
      let artistName: string | null = null;
      if (artistId) {
        const artist = await prisma.artist.findFirst({
          where: { id: Number(artistId) },
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { stripeAccountId, readerId } = req.query as {
      stripeAccountId?: string;
      readerId?: string;
    };

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

      const processor = getPaymentProcessor();
      const { artistId, status } = await processor.getStatus({
        id,
        accountId: stripeAccountId,
      });

      // Only intents Mirlo initiated carry an artistId; anything else isn't
      // ours to cancel.
      if (!artistId) {
        throw new AppError({
          httpCode: 404,
          description: "Purchase not found",
        });
      }

      // Cancelling is a merchant action, same as dispatching: otherwise anyone
      // could kill a legitimate sale mid-tap.
      await artistEditableByUser(artistId, req.user as Express.User);

      if (status === "succeeded") {
        throw new AppError({
          httpCode: 400,
          description: "Purchase has already completed and cannot be canceled",
        });
      }

      if (status === "canceled") {
        return res.status(200).json({ result: { id, status } });
      }

      const result = await processor.cancel({
        id,
        accountId: stripeAccountId,
        readerId,
      });

      res.status(200).json({ result });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Cancel a pending purchase",
    description:
      "Cancels a pending PaymentIntent (pi_*) or SetupIntent (seti_*). " +
      "Requires a logged-in user with edit rights on the artist the purchase " +
      "was initiated for. Pass `readerId` to also clear the Stripe Terminal " +
      "reader's screen if it is still processing this intent (e.g. the " +
      "customer walked away before tapping).",
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
      {
        in: "query",
        name: "readerId",
        required: false,
        type: "string",
        description:
          "Stripe Terminal reader ID (tmr_*) whose in-progress action for this intent should be cleared",
      },
    ],
    responses: {
      200: {
        description: "Purchase canceled",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                id: { type: "string" },
                status: { type: "string" },
              },
            },
          },
        },
      },
      400: {
        description: "Missing parameters or purchase already completed",
      },
      401: { description: "Not logged in" },
      404: {
        description:
          "Purchase not found or user does not have permission to cancel it",
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
