import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { subscribeUserToArtist } from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import { handleTrackGroupPurchase } from "../../../../utils/handleFinishedTransactions";
import { determinePrice } from "../../../../utils/purchasing";
import { createStripeCheckoutSessionForPurchase } from "../../../../utils/stripe/sessions";
import { findUserDiscountPercentsForArtist } from "../../../../utils/user";

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

      let discountPercent: number | undefined;
      if (loggedInUser) {
        const discounts = await findUserDiscountPercentsForArtist(
          loggedInUser.id,
          trackGroup.artistId
        );

        discountPercent = discounts.reduce((max, discount) => {
          return Math.max(max, discount.digitalDiscountPercent ?? 0);
        }, 0);
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
          discountPercent,
        });
        res.status(200).json({
          // redirectUrl: session.url,
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
      console.error(e);
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Purchase a TrackGroup",
    deprecated: true,
    description:
      "Deprecated — use POST /v1/purchase instead. This endpoint uses Stripe Embedded Checkout and will be removed once the frontend migrates to the Payment Element.",
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
            price: {
              type: ["number", "string"],
              description:
                "Price in cents; omit for free or minimum-price releases",
            },
            email: {
              type: ["string", "null"],
              description: "Buyer email (for non-logged-in purchases)",
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
        description:
          "Checkout session created, or purchase completed for free releases",
        schema: {
          type: "object",
          properties: {
            clientSecret: { type: "string" },
            redirectUrl: { type: "string" },
          },
        },
      },
      404: { description: "TrackGroup not found" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
