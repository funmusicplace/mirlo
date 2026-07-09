import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import {
  userAuthenticated,
  userLoggedInWithoutRedirect,
} from "../../../../auth/passport";
import logger from "../../../../logger";
import { deleteStripeSubscriptions } from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import { resolvePayee } from "../../../../utils/payments/payee";
import { cancelUserSubscription } from "../../../../utils/payments/purchase";
import { createCheckoutSessionForSubscription } from "../../../../utils/stripe/sessions";

type Params = {
  id: string;
};

const findTierById = async (tierId: number) => {
  return prisma.artistSubscriptionTier.findFirst({
    where: {
      id: tierId,
    },
    include: {
      artist: {
        include: {
          user: true,
          paymentToUser: true,
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
    let { tierId, email, amount, embedded, name } = req.body;

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
          await prisma.artistUserSubscription.updateMany({
            where: {
              userId,
              artistSubscriptionTierId: oldTier.id,
            },
            data: { deleteReason: "TIER_SWITCHED" },
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
        throw new AppError({
          httpCode: 404,
          description: "Tier not found",
        });
      }
      const stripeAccountId = resolvePayee({
        artist: newTier.artist,
      }).stripeAccountId;

      if (!stripeAccountId) {
        throw new AppError({
          httpCode: 400,
          description: "Artist has not set up with a payment processor yet",
        });
      }

      const useEmbedded = Boolean(embedded);
      const session = await createCheckoutSessionForSubscription({
        loggedInUser,
        email,
        stripeAccountId,
        artistId: newTier.artistId,
        tier: newTier,
        amount,
        userName: name,
        embedded: useEmbedded,
      });
      logger.info(`Generated a Stripe checkout session ${session.id}`);

      res
        .status(200)
        .json(
          useEmbedded
            ? { clientSecret: session.client_secret, stripeAccountId }
            : { sessionUrl: session.url, stripeAccountId }
        );
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
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      const subscription = await prisma.artistUserSubscription.findFirst({
        where: {
          artistSubscriptionTier: { artistId: Number(artistId) },
          userId: loggedInUser.id,
        },
        include: {
          artistSubscriptionTier: true,
        },
      });
      if (!subscription) {
        throw new AppError({
          httpCode: 404,
          description: "Subscription not found",
        });
      }

      // Cancels at period end for paid subscriptions (billing stops, access
      // remains until the paid period ends) or immediately for free tiers,
      // and emails the user a confirmation. See cancelUserSubscription.
      await cancelUserSubscription(subscription, loggedInUser.email);

      res.status(200).json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
