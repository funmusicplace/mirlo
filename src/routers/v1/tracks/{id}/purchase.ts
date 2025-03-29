import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import {
  createStripeCheckoutSessionForPurchase,
  createStripeCheckoutSessionForTrackPurchase,
} from "../../../../utils/stripe";
import {
  handleTrackGroupPurchase,
  handleTrackPurchase,
} from "../../../../utils/handleFinishedTransactions";
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
    const { id: trackId } = req.params as unknown as Params;
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

      const track = await prisma.track.findFirst({
        where: {
          id: Number(trackId),
        },
        include: {
          trackGroup: {
            include: {
              artist: {
                include: {
                  user: true,
                  subscriptionTiers: true,
                },
              },
              paymentToUser: true,
              cover: true,
            },
          },
        },
      });

      if (!track) {
        throw new AppError({
          httpCode: 404,
          description: `Track with ID ${trackId} not found`,
        });
      }

      if (loggedInUser) {
        await subscribeUserToArtist(track.trackGroup?.artist, loggedInUser);
      }

      const stripeAccountId =
        track.trackGroup.paymentToUser?.stripeAccountId ??
        track.trackGroup.artist.user.stripeAccountId;

      const priceNumber =
        (price ? Number(price) : undefined) ?? track.trackGroup.minPrice ?? 0;

      const priceZero =
        (track.trackGroup.minPrice ?? 0) === 0 && priceNumber === 0;

      if (priceNumber < (track.trackGroup.minPrice ?? 0)) {
        throw new AppError({
          httpCode: 400,
          description: `Have to pay at least ${track.trackGroup.minPrice} for this track. ${priceNumber} is not enough`,
        });
      }

      if (!stripeAccountId && !priceZero) {
        throw new AppError({
          httpCode: 400,
          description: "Artist not set up with a payment processor yet",
        });
      }

      if (priceZero && loggedInUser) {
        await handleTrackPurchase(loggedInUser.id, track.id);
        return res.status(200).json({
          redirectUrl: `/${
            track.trackGroup.artist.urlSlug ?? track.trackGroup.artist.id
          }/release/${track.trackGroup.urlSlug ?? track.trackGroup.id}/download?email=${
            loggedInUser.email
          }`,
        });
      }

      if (stripeAccountId) {
        const session = await createStripeCheckoutSessionForTrackPurchase({
          loggedInUser,
          email,
          priceNumber,
          track,
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
    summary: "Purchase a Track",
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
