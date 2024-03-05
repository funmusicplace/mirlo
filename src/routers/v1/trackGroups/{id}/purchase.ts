import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

import {
  createTrackGroupStripeProduct,
  handleTrackGroupPurchase,
  createStripeCheckoutSessionForPurchase,
} from "../../../../utils/stripe";
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
    const { id: trackGroupId } = req.params as unknown as Params;
    let { price, email } = req.body as unknown as {
      price?: string; // In cents
      email?: string;
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
            },
          },
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

      const stripeAccountId = trackGroup.artist.user.stripeAccountId;

      const priceNumber =
        (price ? Number(price) : undefined) ?? trackGroup.minPrice ?? 0;

      const priceZero = (trackGroup.minPrice ?? 0) === 0 && priceNumber === 0;

      if (priceNumber < (trackGroup.minPrice ?? 0)) {
        throw new AppError({
          httpCode: 400,
          description: `Have to pay at least ${trackGroup.minPrice} for this trackGroup. ${priceNumber} is not enough`,
        });
      }

      if (!stripeAccountId && !priceZero) {
        throw new AppError({
          httpCode: 400,
          description: "Artist not set up with a payment processor yet",
        });
      }

      if (priceZero && loggedInUser) {
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
        const productKey = await createTrackGroupStripeProduct(
          trackGroup,
          stripeAccountId
        );

        if (productKey) {
          const session = await createStripeCheckoutSessionForPurchase({
            loggedInUser,
            email,
            priceNumber,
            trackGroup,
            productKey,
            stripeAccountId,
          });
          res.status(200).json({
            redirectUrl: session.url,
          });
        } else {
          new AppError({
            httpCode: 500,
            description:
              "We didn't have enough information from the artist to start a Stripe session",
          });
        }
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
