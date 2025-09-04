import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import prisma from "@mirlo/prisma";

import stripe from "../../../utils/stripe";
import { findOrCreateUserBasedOnEmail } from "../../../utils/user";
import { Stripe } from "stripe";
import { createOrUpdatePledge } from "../../../utils/trackGroup";
import { subscribeUserToArtist } from "../../../utils/artist";
import { logger } from "../../../logger";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { setupIntent, stripeAccountId } = req.query;
    try {
      if (
        typeof setupIntent === "string" &&
        typeof stripeAccountId === "string"
      ) {
        const intent = await stripe.setupIntents.retrieve(setupIntent, {
          stripeAccount: stripeAccountId as string | undefined,
        });

        if (intent) {
          let userId = intent.metadata?.userId
            ? Number(intent.metadata?.userId)
            : undefined;

          if (typeof intent.customer === "string" && !userId) {
            const customer = await stripe.customers.retrieve(intent.customer, {
              stripeAccount: stripeAccountId,
            });
            if (
              customer &&
              typeof customer === "object" &&
              "email" in customer &&
              customer.email
            ) {
              let response = await findOrCreateUserBasedOnEmail(customer.email);

              userId = Number(response.userId);
            }
          }
          if (
            intent.status === "succeeded" &&
            userId &&
            intent.metadata?.trackGroupId &&
            intent.metadata?.paymentIntentAmount
          ) {
            logger.info(
              `Setting up succeeded intent: ${userId}, trackGroupId: ${intent.metadata?.trackGroupId}`
            );
            await createOrUpdatePledge({
              userId,
              trackGroupId: Number(intent.metadata?.trackGroupId),
              message: intent.metadata?.message,
              amount: Number(intent.metadata?.paymentIntentAmount),
              stripeSetupIntentId: intent.id,
            });
            const artist = await prisma.artist.findFirst({
              where: {
                trackGroups: {
                  some: {
                    id: Number(intent.metadata.trackGroupId),
                  },
                },
              },
              include: { user: true, subscriptionTiers: true },
            });
            const user = await prisma.user.findUnique({
              where: { id: userId },
            });
            if (artist && user) {
              await subscribeUserToArtist(artist, user);
            }
          }

          return res
            .json({
              result: {
                status: intent.status,
                paymentIntentAmount: intent.metadata?.paymentIntentAmount,
                trackGroupId: intent.metadata?.trackGroupId,
              },
            })
            .status(200);
        } else {
          res.status(404).json({ error: "SetupIntent not found" });
        }
      } else {
        res.status(404);
      }
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
