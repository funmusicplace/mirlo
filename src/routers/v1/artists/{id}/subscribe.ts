import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userLoggedInWithoutRedirect,
} from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

const { API_DOMAIN } = process.env;

import stripe, {
  createSubscriptionStripeProduct,
} from "../../../../utils/stripe";
import { deleteStripeSubscriptions } from "../../../../utils/artist";
import logger from "../../../../logger";
import { getSiteSettings } from "../../../../utils/settings";

type Params = {
  id: string;
};

const findTierById = async (tierId: number) => {
  return await prisma.artistSubscriptionTier.findFirst({
    where: {
      id: tierId,
    },
    include: {
      artist: {
        include: {
          user: true,
        },
      },
    },
  });
};

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
    DELETE: [userAuthenticated, DELETE],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;
    let { tierId, email, amount } = req.body;

    const loggedInUser = req.user as User | undefined;

    try {
      const client = await prisma.client.findFirst({});

      if (loggedInUser) {
        const { id: userId } = loggedInUser;
        const user = await prisma.user.findFirst({
          where: {
            id: userId,
          },
        });
        email = user?.email;

        const oldTier = await prisma.artistSubscriptionTier.findFirst({
          where: {
            AND: {
              userSubscriptions: {
                some: {
                  userId: userId,
                },
              },
              artistId: Number(artistId),
            },
          },
          include: {
            artist: {
              include: {
                user: true,
              },
            },
          },
        });
        if (oldTier) {
          logger.info(
            `Deleting old subscriptions for ${artistId}, old tier: ${oldTier.id}`
          );
          await deleteStripeSubscriptions({
            artistSubscriptionTier: { artistId: Number(artistId) },
            userId,
          });
          await prisma.artistUserSubscription.deleteMany({
            where: {
              artistSubscriptionTier: { artistId: Number(artistId) },
              userId,
            },
          });
        }
      }

      const newTier = await findTierById(tierId);

      if (!newTier) {
        return res.status(404);
      }
      const stripeAccountId = newTier.artist.user.stripeAccountId;

      if (!stripeAccountId) {
        return res.status(400).json({
          error: "Artist has not set up with a payment processor yet",
        });
      }

      const productKey = await createSubscriptionStripeProduct(
        newTier,
        stripeAccountId
      );

      logger.info(
        `Created a new product for artist ${artistId}, ${productKey}`
      );

      if (productKey) {
        const session = await stripe.checkout.sessions.create(
          {
            billing_address_collection: "auto",
            customer_email: loggedInUser?.email || email,
            subscription_data: {
              application_fee_percent:
                newTier.platformPercent ??
                (await getSiteSettings()).platformPercent / 100,
            },
            line_items: [
              {
                price_data: {
                  tax_behavior: "exclusive",
                  unit_amount: newTier.allowVariable
                    ? amount || newTier.minAmount
                    : newTier.minAmount ?? 0,
                  currency: newTier.currency ?? "USD",
                  product: productKey,
                  recurring: { interval: "month" },
                },
                quantity: 1,
              },
            ],
            metadata: {
              clientId: client?.id ?? null,
              artistId,
              tierId,
              userId: loggedInUser?.id ?? null,
              userEmail: email ?? null,
              stripeAccountId,
            },
            mode: "subscription",
            success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
          },
          {
            stripeAccount: stripeAccountId,
          }
        );
        logger.info(`Generated a Stripe checkout session ${session.id}`);

        res.status(200).json({
          sessionUrl: session.url,
        });
      } else {
        res.status(500).json({
          error: "Something went wrong while subscribing the user",
        });
      }
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Subscribes a user to an artist",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "subscribe",
        schema: {
          type: "object",
          required: ["tierId"],
          properties: {
            tierId: {
              type: "number",
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Created artistSubscriptionTier",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    try {
      await deleteStripeSubscriptions({
        artistSubscriptionTier: { artistId: Number(artistId) },
        userId: loggedInUser.id,
      });

      await prisma.artistUserSubscription.deleteMany({
        where: {
          artistSubscriptionTier: { artistId: Number(artistId) },
          userId: loggedInUser.id,
        },
      });

      res.status(200).json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
