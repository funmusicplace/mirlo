import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import { createStripeCheckoutSessionForTip } from "../../../../utils/stripe";
import { subscribeUserToArtist } from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;
    let { price, email, message } = req.body as unknown as {
      price?: string; // In cents
      email?: string;
      message?: string; // Optional message to the artist
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

      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
        },
        include: {
          user: true,
          subscriptionTiers: true,
          paymentToUser: true,
        },
      });

      if (!artist) {
        throw new AppError({
          httpCode: 404,
          description: `Artist not found`,
        });
      }

      if (loggedInUser) {
        await subscribeUserToArtist(artist, loggedInUser);
      }

      const stripeAccountId =
        artist.paymentToUser?.stripeAccountId ?? artist.user.stripeAccountId;

      const priceNumber = price ? Number(price) : undefined;

      if (!stripeAccountId) {
        throw new AppError({
          httpCode: 400,
          description: "Artist not set up with a payment processor yet",
        });
      }

      if (!priceNumber) {
        throw new AppError({
          httpCode: 400,
          description: "Can't tip someone zero",
        });
      }

      if (stripeAccountId) {
        const session = await createStripeCheckoutSessionForTip({
          loggedInUser,
          email,
          priceNumber,
          message,
          stripeAccountId,
          artistId: Number(artistId),
          currency: artist.user.currency ?? "usd",
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
