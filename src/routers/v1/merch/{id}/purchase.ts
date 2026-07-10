import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { subscribeUserToArtist } from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import { resolvePayee } from "../../../../utils/payments/payee";
import { determinePrice } from "../../../../utils/purchasing";
import { createStripeCheckoutSessionForMerchPurchase } from "../../../../utils/stripe/sessions";
import { findUserDiscountPercentsForArtist } from "../../../../utils/user";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: merchId } = req.params as unknown as Params;
    let {
      price,
      email,
      quantity,
      merchOptionIds,
      message,
      shippingDestinationId,
    } = req.body as unknown as {
      price?: string; // In cents
      email?: string;
      quantity?: number;
      merchOptionIds: string[];
      shippingDestinationId: string;
      message?: string; // Optional message for the artist
    };
    const loggedInUser = req.user;

    try {
      if (loggedInUser) {
        const { id: userId } = loggedInUser;
        const user = await prisma.user.findFirst({
          where: {
            id: userId,
          },
        });
        email = user?.email;
      }

      const merch = await prisma.merch.findFirst({
        where: {
          id: merchId,
        },
        include: {
          profile: {
            include: {
              user: true,
              subscriptionTiers: true,
              paymentToUser: true,
            },
          },
          shippingDestinations: true,
          images: true,
          optionTypes: {
            include: {
              options: true,
            },
          },
        },
      });

      if (!merch) {
        throw new AppError({
          httpCode: 404,
          description: `Merch with ID ${merch} not found`,
        });
      }

      // Check if the options passed are possible
      const finalOptionIds: string[] = [];

      const additionalPrices: number[] = [];
      merch.optionTypes.forEach((ot) => {
        ot.options.forEach((o) => {
          if (merchOptionIds.includes(o.id)) {
            finalOptionIds.push(o.id);
            if (o.additionalPrice) {
              additionalPrices.push(o.additionalPrice);
            }
          }
        });
      });

      const additionalPrice = additionalPrices.reduce(
        (aggr, price) => price + aggr,
        0
      );

      let discountPercent: number | undefined;
      if (loggedInUser) {
        const discounts = await findUserDiscountPercentsForArtist(
          loggedInUser.id,
          merch.profileId
        );

        discountPercent = discounts.reduce((max, discount) => {
          return Math.max(max, discount.merchDiscountPercent ?? 0);
        }, 0);
      }

      if (loggedInUser) {
        await subscribeUserToArtist(merch?.profile, loggedInUser);
      }

      const stripeAccountId = resolvePayee({
        artist: merch.profile,
      }).stripeAccountId;

      const { priceNumber, isPriceZero } = determinePrice(
        price,
        merch.minPrice
      );

      if (!stripeAccountId && !isPriceZero) {
        throw new AppError({
          httpCode: 400,
          description: "Profile not set up with a payment processor yet",
        });
      }

      if (stripeAccountId) {
        const session = await createStripeCheckoutSessionForMerchPurchase({
          loggedInUser,
          email,
          priceNumber: priceNumber + additionalPrice,
          merch,
          message,
          quantity: quantity ?? 0,
          stripeAccountId,
          shippingDestinationId,
          discountPercent,
          options: { merchOptionIds: finalOptionIds },
        });
        res.status(200).json({
          redirectUrl: session.url,
          clientSecret: session.client_secret,
        });
      } else {
        throw new AppError({
          httpCode: 500,
          description:
            "We didn't have enough information from the artist to start a Stripe session",
        });
      }
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Purchase a merch item",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
        description: "Merch item ID",
      },
      {
        in: "body",
        name: "purchase",
        schema: {
          type: "object",
          required: ["shippingDestinationId"],
          properties: {
            price: {
              type: ["number", "string"],
              description: "Price in cents",
            },
            email: {
              type: "string",
              description: "Buyer email (for non-logged-in purchases)",
            },
            quantity: {
              type: "number",
              description: "Number of items",
            },
            merchOptionIds: {
              type: "array",
              items: { type: "string" },
              description: "Selected option IDs (size, colour, etc.)",
            },
            shippingDestinationId: {
              type: "string",
              description: "ID of the shipping destination",
            },
            message: {
              type: "string",
              description: "Optional message to the artist",
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Checkout session created",
        schema: {
          type: "object",
          properties: {
            clientSecret: { type: "string" },
            redirectUrl: { type: "string" },
          },
        },
      },
      404: {
        description: "Merch item not found",
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
