import Stripe from "stripe";
import prisma from "../../prisma/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "../logger";
import sendMail from "../jobs/send-mail";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { Session } from "inspector";
import { registerPurchase } from "./trackGroup";
import { registerSubscription } from "./subscriptionTier";

const { STRIPE_KEY } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

export const createSubscriptionStripeProduct = async (
  tier: Prisma.ArtistSubscriptionTierGetPayload<{ include: { artist: true } }>,
  stripeAccountId: string
) => {
  let productKey = tier.stripeProductKey;
  if (productKey) {
    try {
      await stripe.products.retrieve(productKey, {
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
      }
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
  signingSecret?: string
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
        signingSecret
      );
    } catch (e) {
      console.log(
        `⚠️  Webhook signature verification failed.`,
        (e as Error).message
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
  newUser: boolean
) => {
  try {
    const purchase = await registerPurchase({
      userId: Number(userId),
      trackGroupId: Number(trackGroupId),
      pricePaid: session.amount_total ?? 0,
      currencyPaid: session.currency ?? "USD",
      paymentProcessorKey: session.id,
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
        artist: {
          include: {
            subscriptionTiers: true,
            user: true,
          },
        },
      },
    });

    if (user && trackGroup && purchase) {
      const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

      await sendMail({
        data: {
          template: newUser ? "album-download" : "album-purchase-receipt",
          message: {
            to: user.email,
          },
          locals: {
            trackGroup,
            purchase,
            isBeforeReleaseDate,
            token: purchase.singleDownloadToken,
            email: user.email,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          },
        },
      });

      const pricePaid = purchase.pricePaid / 100;

      await sendMail({
        data: {
          template: "album-purchase-artist-notification",
          message: {
            to: trackGroup.artist.user.email,
          },
          locals: {
            trackGroup,
            purchase,
            pricePaid,
            platformCut: ((trackGroup.platformPercent ?? 5) * pricePaid) / 100,
            email: user.email,
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
  session: Stripe.Checkout.Session
) => {
  try {
    const artistUserSubscription = await registerSubscription({
      userId: Number(userId),
      tierId: Number(tierId),
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "USD",
      paymentProcessorKey: session.subscription as string, // FIXME: should this be session id? Maybe subscriptionId?
    });

    if (artistUserSubscription) {
      await sendMail({
        data: {
          template: "artist-subscription-receipt",
          message: {
            to: artistUserSubscription.user.email,
          },
          locals: {
            artist: artistUserSubscription.artistSubscriptionTier.artist,
            artistUserSubscription,
            user: artistUserSubscription.user,
            email: artistUserSubscription.user.email,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          },
        },
      });
    }
  } catch (e) {
    logger.error(`Error creating subscription: ${e}`);
  }
};

type SessionMetaData = {
  tierId: string;
  userEmail: string;
  userId: string;
  trackGroupId: string;
  stripeAccountId: string;
};

export const handleCheckoutSession = async (
  session: Stripe.Checkout.Session
) => {
  const metadata = session.metadata as unknown as SessionMetaData;
  const { tierId, trackGroupId, stripeAccountId } = metadata;
  let { userId, userEmail } = metadata;
  userEmail = userEmail || (session.customer_details?.email ?? "");
  logger.info(
    `handle checkout session: sessionId: ${session.id}, stripeAccountId: ${stripeAccountId}, tierId: ${tierId}, trackGroupId: ${trackGroupId}`
  );
  logger.info(`have user info: userId: ${userId} userEmail: ${userEmail}`);
  session = await stripe.checkout.sessions.retrieve(
    session.id,
    {
      expand: ["line_items"],
    },
    { stripeAccount: stripeAccountId }
  );
  let newUser = false;

  // If the user doesn't exist, we create one with an existing userEmail
  if (!userId && userEmail) {
    newUser = true; // If this is true the user wasn't logged in when making the purchase
    let user = await prisma.user.findFirst({
      where: {
        email: userEmail,
      },
    });
    if (!user) {
      logger.info(`Creating a new user for ${userEmail}`);
      user = await prisma.user.create({
        data: {
          email: userEmail,
        },
      });
    }
    userId = `${user?.id}`;
  }
  logger.info(`Processing session`);
  if (tierId && userEmail) {
    await handleSubscription(Number(userId), Number(tierId), session);
  } else if (trackGroupId && userId) {
    await handleTrackGroupPurhcase(
      Number(userId),
      Number(trackGroupId),
      session,
      newUser
    );
  }
};

export default stripe;
