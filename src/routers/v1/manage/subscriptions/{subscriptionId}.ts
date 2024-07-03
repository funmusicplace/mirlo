import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import stripe from "../../../../utils/stripe";
import { AppError } from "../../../../utils/error";

type Params = {
  subscriptionId: number;
  userId: string;
};

export default function () {
  const operations = {
    DELETE: [userAuthenticated, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { userId, subscriptionId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    if (loggedInUser.id !== Number(userId)) {
      res.status(401);
      return next();
    }
    try {
      const subscription = await prisma.artistUserSubscription.findFirst({
        where: {
          id: Number(subscriptionId),
          userId: Number(userId),
        },
        include: {
          artistSubscriptionTier: true,
        },
      });
      if (subscription?.stripeSubscriptionKey) {
        const artistUser = await prisma.user.findFirst({
          where: {
            artists: {
              some: {
                id: subscription.artistSubscriptionTier.artistId,
              },
            },
          },
        });
        try {
          if (artistUser?.stripeAccountId) {
            await stripe.subscriptions.cancel(
              subscription.stripeSubscriptionKey,
              { stripeAccount: artistUser?.stripeAccountId }
            );
          }
        } catch (e) {
          if (e instanceof Error) {
            e.message.includes("No such subscription");
            console.error("Weird, no subscription", e.message);
          }
        }
      }
      await prisma.artistUserSubscription.deleteMany({
        where: {
          id: Number(subscriptionId),
          userId: Number(userId),
        },
      });
      res.json({ message: "Success" });
    } catch (e) {
      throw new AppError({
        httpCode: 400,
        description: "Something went wrong",
      });
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a subscription belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "subscriptionId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
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
