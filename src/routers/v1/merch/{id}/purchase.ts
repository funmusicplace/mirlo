import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import {
  createStripeCheckoutSessionForMerchPurchase,
  createStripeCheckoutSessionForPurchase,
} from "../../../../utils/stripe";
import { handleTrackGroupPurchase } from "../../../../utils/handleFinishedTransactions";
import { subscribeUserToArtist } from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import { determinePrice } from "../../../../utils/purchasing";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: merchId } = req.params as unknown as Params;
    let { price, email, quantity } = req.body as unknown as {
      price?: string; // In cents
      email?: string;
      quantity?: number;
    };
    const loggedInUser = req.user as User | undefined;

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
          artist: {
            include: {
              user: true,
              subscriptionTiers: true,
            },
          },
          images: true,
        },
      });

      if (!merch) {
        throw new AppError({
          httpCode: 404,
          description: `Merch with ID ${merch} not found`,
        });
      }

      if (loggedInUser) {
        await subscribeUserToArtist(merch?.artist, loggedInUser);
      }

      const stripeAccountId = merch.artist.user.stripeAccountId;

      const { priceNumber, isPriceZero } = determinePrice(
        Number(price),
        merch.minPrice
      );

      if (!stripeAccountId && !isPriceZero) {
        throw new AppError({
          httpCode: 400,
          description: "Artist not set up with a payment processor yet",
        });
      }

      if (stripeAccountId) {
        const session = await createStripeCheckoutSessionForMerchPurchase({
          loggedInUser,
          email,
          priceNumber,
          merch,
          quantity: quantity ?? 0,
          stripeAccountId,
        });
        res.status(200).json({
          redirectUrl: session.url,
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
    summary: "Purchase a TrackGroup",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "purchase",
        schema: {
          type: "object",
          required: [],
          properties: {
            trackGroupId: {
              type: "number",
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "purchased artist",
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
