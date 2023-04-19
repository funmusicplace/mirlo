import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../../../../prisma/prisma";

const { STRIPE_KEY, STRIPE_WEBHOOK_SIGNING_SECRET } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

const handleCheckoutSession = async (session: Stripe.Checkout.Session) => {
  console.log("session", session);
  const { tierId, userId, trackGroupId } = session.metadata as unknown as {
    tierId: number;
    userId: number;
    trackGroupId: number;
  };
  if (tierId && userId) {
    await prisma.artistUserSubscription.upsert({
      create: {
        artistSubscriptionTierId: Number(tierId),
        userId: Number(userId),
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "USD",
        stripeId: session.id, // FIXME: should this be session id? Maybe subscriptionId?
      },
      update: {
        artistSubscriptionTierId: Number(tierId),
        userId: Number(userId),
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "USD",
        stripeId: session.id, // FIXME: should this be session id? Maybe subscriptionId?
      },
      where: {
        userId_artistSubscriptionTierId: {
          userId: Number(userId),
          artistSubscriptionTierId: Number(tierId),
        },
      },
    });
  } else if (trackGroupId && userId) {
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: Number(userId),
        trackGroupId: Number(trackGroupId),
        pricePaid: session.amount_total ?? 0,
        currencyPaid: session.currency ?? "USD",
        stripeId: session.id,
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
