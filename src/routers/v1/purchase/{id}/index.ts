import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  artistEditableByUser,
  userAuthenticated,
  userLoggedInWithoutRedirect,
} from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { getPaymentProcessor } from "../../../../utils/payments/PaymentProcessor";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
    PUT: [userLoggedInWithoutRedirect, PUT],
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

      let artistName: string | null = null;
      if (artistId) {
        const artist = await prisma.profile.findFirst({
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
    description: "The id is the payment processor id.",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
        description:
          "Stripe's PaymentIntent ID (pi_*) or SetupIntent ID (seti_*)",
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
                requiresShipping: {
                  type: "boolean",
                  description:
                    "Physical merch, or a collectAddress subscription tier — the hosted checkout page should render an AddressElement before confirming.",
                },
                allowedCountries: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Country codes the AddressElement's picker should offer, when requiresShipping is true.",
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

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { stripeAccountId } = req.query as { stripeAccountId?: string };
    const { shippingAddress, email } = req.body as {
      shippingAddress?: { name?: string; address: Record<string, unknown> };
      email?: string;
    };
    const loggedInUser = req.user as Express.User | undefined;

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
      if (!shippingAddress && !email && !loggedInUser) {
        throw new AppError({
          httpCode: 400,
          description: "shippingAddress or email is required",
        });
      }

      const processor = getPaymentProcessor();

      if (shippingAddress) {
        if (!shippingAddress.address) {
          throw new AppError({
            httpCode: 400,
            description: "shippingAddress.address is required",
          });
        }

        await processor.attachShippingAddress({
          id,
          accountId: stripeAccountId,
          shippingAddress,
        });
      }

      if (loggedInUser) {
        await processor.attachIdentity({
          id,
          accountId: stripeAccountId,
          userId: loggedInUser.id,
          userEmail: loggedInUser.email,
        });
      } else if (email) {
        if (!EMAIL_REGEX.test(email)) {
          throw new AppError({
            httpCode: 400,
            description: "email is not a valid email address",
          });
        }
        await processor.attachIdentity({
          id,
          accountId: stripeAccountId,
          userEmail: email,
        });
      }

      res.status(200).json({ result: { id } });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Update a pending purchase",
    description: "Primarily used to set a shipping address on it.",
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
        in: "body",
        name: "body",
        required: true,
        schema: {
          type: "object",
          properties: {
            shippingAddress: {
              type: "object",
              required: ["address"],
              properties: {
                name: { type: "string" },
                address: { type: "object" },
              },
            },
            email: { type: "string" },
          },
        },
      },
    ],
    responses: {
      200: { description: "Shipping address and/or identity attached" },
      400: { description: "Missing or invalid parameters" },
      409: {
        description:
          "This purchase is already associated with a different buyer",
      },
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

      if (!artistId) {
        throw new AppError({
          httpCode: 404,
          description: "Purchase not found",
        });
      }

      await artistEditableByUser(Number(artistId), req.user as Express.User);

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
      "Cancels a pending PaymentIntent (pi_*) or SetupIntent (seti_*). ",
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
