import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import { createStripeCheckoutSessionForPurchase } from "../../../../utils/stripe";
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
    const { id: trackGroupId } = req.params as unknown as Params;
    let { price, email, message } = req.body as unknown as {
      price?: string; // In cents
      email?: string;
      message?: string; // Optional message for the artist
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

      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          artist: {
            include: {
              user: true,
              subscriptionTiers: true,
              paymentToUser: true,
            },
          },
          paymentToUser: true,
          cover: true,
        },
      });

      if (!trackGroup) {
        throw new AppError({
          httpCode: 404,
          description: `TrackGroup with ID ${trackGroupId} not found`,
        });
      }

      if (loggedInUser) {
        await subscribeUserToArtist(trackGroup?.artist, loggedInUser);
      }

      const stripeAccountId =
        trackGroup.paymentToUser?.stripeAccountId ??
        trackGroup.artist.paymentToUser?.stripeAccountId ??
        trackGroup.artist.user.stripeAccountId;

      const { isPriceZero, priceNumber } = determinePrice(
        price,
        trackGroup.minPrice
      );

      if (!stripeAccountId && !isPriceZero) {
        throw new AppError({
          httpCode: 400,
          description: "Artist not set up with a payment processor yet",
        });
      }

      if (isPriceZero && loggedInUser) {
        await handleTrackGroupPurchase(loggedInUser.id, trackGroup.id);
        return res.status(200).json({
          redirectUrl: `/${
            trackGroup.artist.urlSlug ?? trackGroup.artist.id
          }/release/${trackGroup.urlSlug ?? trackGroup.id}/download?email=${
            loggedInUser.email
          }`,
        });
      }

      if (stripeAccountId) {
        const session = await createStripeCheckoutSessionForPurchase({
          loggedInUser,
          email,
          priceNumber,
          message,
          trackGroup,
          stripeAccountId,
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
