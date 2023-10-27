import Stripe from "stripe";
import prisma from "../../prisma/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "../logger";
import sendMail from "../jobs/send-mail";
import { Request, Response } from "express";

const { STRIPE_KEY } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

export const createSubscriptionStripeProduct = async (
  tier: Prisma.ArtistSubscriptionTierGetPayload<{ include: { artist: true } }>,
  stripeAccountId: string,
) => {
  let productKey = tier.stripeProductKey;
  if (productKey) {
    try {
      const product = await stripe.products.retrieve(productKey, {
        stripeAccount: stripeAccountId,
      });
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes("No such product")) {
          console.error("Weird, product doesn't exist", e.message);
          productKey = null;
        }
      }
    }
  }

  if (!productKey) {
    const product = await stripe.products.create(
      {
        name: `Supporting ${tier.artist.name} at ${tier.name}`,
        description: tier.description ?? "Thank you for your support!",
      },
      {
        stripeAccount: stripeAccountId,
      },
    );
    await prisma.artistSubscriptionTier.update({
      where: {
        id: Number(tier.id),
      },
      data: {
        stripeProductKey: product.id,
      },
    });
    productKey = product.id;
  }
  return productKey;
};

export const verifyStripeSignature = async (
  req: Request,
  res: Response,
  signingSecret?: string,
) => {
  const signature = req.headers["stripe-signature"];
  let event = req.body;
  if (signingSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(
        // See https://stackoverflow.com/a/70951912/154392
        // @ts-ignore
        req.rawBody,
        signature ?? "",
        signingSecret,
      );
    } catch (e) {
      console.log(
        `⚠️  Webhook signature verification failed.`,
        (e as Error).message,
      );
      return res.sendStatus(400);
    }
  }

  return event;
};

const handleTrackGroupPurhcase = async (
  userId: number,
  trackGroupId: number,
  session: Stripe.Checkout.Session,
) => {
  try {
    const purchase = await prisma.userTrackGroupPurchase.create({
      data: {
        userId: Number(userId),
        trackGroupId: Number(trackGroupId),
        pricePaid: session.amount_total ?? 0,
        currencyPaid: session.currency ?? "USD",
        stripeSessionKey: session.id,
      },
    });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    const trackGroup = await prisma.trackGroup.findFirst({
      where: {
        id: trackGroupId,
      },
      include: {
        artist: true,
      },
    });

    if (user && trackGroup && purchase) {
      await sendMail({
        data: {
          template: "album-purchase-receipt",
          message: {
            to: user.email,
          },
          locals: {
            trackGroup,
            purchase,
            host: process.env.API_DOMAIN,
          },
        },
      });
    }
  } catch (e) {
    logger.error(`Error creating album purchase: ${e}`);
  }
};

const handleSubscription = async (
  userId: number,
  tierId: number,
  session: Stripe.Checkout.Session,
) => {
  try {
    const results = await prisma.artistUserSubscription.upsert({
      create: {
        artistSubscriptionTierId: Number(tierId),
        userId: Number(userId),
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "USD",
        deletedAt: null,
        stripeSubscriptionKey: session.subscription as string, // FIXME: should this be session id? Maybe subscriptionId?
      },
      update: {
        artistSubscriptionTierId: Number(tierId),
        userId: Number(userId),
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "USD",
        deletedAt: null, // Undelete
        stripeSubscriptionKey: session.subscription as string, // FIXME: should this be session id? Maybe subscriptionId?
      },
      where: {
        userId_artistSubscriptionTierId: {
          userId: Number(userId),
          artistSubscriptionTierId: Number(tierId),
        },
      },
    });
  } catch (e) {
    logger.error(`Error creating subscription: ${e}`);
  }
};

export const handleCheckoutSession = async (
  session: Stripe.Checkout.Session,
) => {
  const { tierId, userId, trackGroupId, stripeAccountId } =
    session.metadata as unknown as {
      tierId: string;
      userId: string;
      trackGroupId: string;
      stripeAccountId: string;
    };
  console.log("handle checkout session", stripeAccountId, tierId, trackGroupId);
  session = await stripe.checkout.sessions.retrieve(
    session.id,
    {
      expand: ["line_items"],
    },
    { stripeAccount: stripeAccountId },
  );
  if (tierId && userId) {
    await handleSubscription(Number(userId), Number(tierId), session);
  } else if (trackGroupId && userId) {
    await handleTrackGroupPurhcase(
      Number(userId),
      Number(trackGroupId),
      session,
    );
  }
};

export default stripe;
