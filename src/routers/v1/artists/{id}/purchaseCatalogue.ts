import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { subscribeUserToProfile } from "../../../../utils/artist";
import { calculateCatalogueFloorPrice } from "../../../../utils/catalogue";
import { AppError } from "../../../../utils/error";
import { resolvePayee } from "../../../../utils/payments/payee";
import { determinePrice } from "../../../../utils/purchasing";
import { createStripeCheckoutSessionForCatalogue } from "../../../../utils/stripe/sessions";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    GET: [GET],
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: profileId } = req.params as unknown as Params;
    try {
      const profile = await prisma.profile.findFirst({
        where: {
          id: Number(profileId),
        },
      });

      if (!profile) {
        throw new AppError({
          httpCode: 404,
          description: `Artist with ID ${profileId} not found`,
        });
      }

      res.status(200).json({
        result: {
          price: profile.allowPurchaseEntireCatalog
            ? await calculateCatalogueFloorPrice(profile)
            : null,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Get the current price to buy an artist's entire catalogue, recalculated live",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
    ],
    responses: {
      200: {
        description:
          "The current price in cents, or null if the artist doesn't offer entire-catalogue purchases",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: profileId } = req.params as unknown as Params;
    let { price, email, message } = req.body as unknown as {
      price?: string; // In cents
      email?: string;
      message?: string;
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

      const profile = await prisma.profile.findFirst({
        where: {
          id: Number(profileId),
        },
        include: {
          user: true,
          paymentToUser: true,
          subscriptionTiers: true,
          avatar: true,
        },
      });

      if (!profile) {
        throw new AppError({
          httpCode: 404,
          description: `Artist with ID ${profileId} not found`,
        });
      }

      if (loggedInUser) {
        await subscribeUserToProfile(profile, loggedInUser);
      }

      const stripeAccountId = resolvePayee({ profile }).stripeAccountId;

      const floorPrice = await calculateCatalogueFloorPrice(profile);
      const { isPriceZero, priceNumber } = determinePrice(price, floorPrice);

      if (!stripeAccountId && !isPriceZero) {
        throw new AppError({
          httpCode: 400,
          description: "Artist not set up with a payment processor yet",
        });
      }

      if (isPriceZero && loggedInUser) {
        throw new AppError({
          httpCode: 400,
          description: "You can't purchase a catalogue for free",
        });
      }

      if (stripeAccountId) {
        const session = await createStripeCheckoutSessionForCatalogue({
          loggedInUser,
          email,
          priceNumber,
          message,
          artist: profile,
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
        type: "number",
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
