import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userLoggedInWithoutRedirect,
} from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import { createCheckoutSessionForSubscription } from "../../../../utils/stripe";
import { deleteStripeSubscriptions } from "../../../../utils/artist";
import logger from "../../../../logger";
import { AppError } from "../../../../utils/error";

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
    let { tierId, email, amount } = req.body;

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
        throw new AppError({
          httpCode: 404,
          description: "Tier not found",
        });
      }
      const stripeAccountId =
        newTier.artist.paymentToUser?.stripeAccountId ??
        newTier.artist.user.stripeAccountId;

      if (!stripeAccountId) {
        throw new AppError({
          httpCode: 400,
          description: "Artist has not set up with a payment processor yet",
        });
      }

      const session = await createCheckoutSessionForSubscription({
        loggedInUser,
        email,
        stripeAccountId,
        artistId: newTier.artistId,
        tier: newTier,
        amount,
      });
      logger.info(`Generated a Stripe checkout session ${session.id}`);

      res.status(200).json({
        sessionUrl: session.url,
      });
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
