import { Artist, PrismaClient, User } from "@prisma/client";
import express, { NextFunction, Request, Response } from "express";
import { pick } from "lodash";
import Stripe from "stripe";
import { userAuthenticated } from "../../../auth/passport";

const { STRIPE_KEY, STRIPE_WEBHOOK_SIGNING_SECRET } = process.env;
const prisma = new PrismaClient();

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

const handleCheckoutSession = async (session: Stripe.Checkout.Session) => {
  const { tierId, userId } = session.metadata as unknown as {
    tierId: number;
    userId: number;
  };
  if (tierId && userId) {
    await prisma.artistUserSubscription.upsert({
      create: {
        artistSubscriptionTierId: +tierId,
        userId: +userId,
        amount: `${session.amount_total ?? "0"}`,
        stripeId: session.id,
      },
      update: {
        artistSubscriptionTierId: +tierId,
        userId: +userId,
        amount: `${session.amount_total ?? "0"}`,
        stripeId: session.id,
      },
      where: {
        userId_artistSubscriptionTierId: {
          userId: Number(userId),
          artistSubscriptionTierId: Number(tierId),
        },
      },
    });
  }
};

export default function () {
  const operations = {
    POST,
  };

  async function POST(req: Request, res: Response) {
    const signature = req.headers["stripe-signature"];

    let event = req.body;
    if (STRIPE_WEBHOOK_SIGNING_SECRET && signature) {
      try {
        event = stripe.webhooks.constructEvent(
          // See https://stackoverflow.com/a/70951912/154392
          // @ts-ignore
          req.rawBody,
          signature ?? "",
          STRIPE_WEBHOOK_SIGNING_SECRET
        );
      } catch (e) {
        console.log(
          `⚠️  Webhook signature verification failed.`,
          (e as Error).message
        );
        return res.sendStatus(400);
      }
    }

    let subscription;
    let status;
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        // To trigger this event type use
        // stripe trigger checkout.session.completed --add checkout_session:metadata.userId=3 --add checkout_session:metadata.tierId=2
        const session = event.data.object;
        console.log(`Subscription status is ${session.status}.`);

        handleCheckoutSession(session);
      default:
        // Unexpected event type
        console.log(`Unhandled Stripe event type ${event.type}.`);
    }
    // Return a 200 response to acknowledge receipt of the event
    res.send();
  }

  return operations;
}
