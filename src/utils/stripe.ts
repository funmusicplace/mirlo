import Stripe from "stripe";
import prisma from "@mirlo/prisma";
import { Prisma, User } from "@mirlo/prisma/client";
import { logger } from "../logger";
import sendMail from "../jobs/send-mail";
import { Request, Response } from "express";
import { findOrCreateUserBasedOnEmail } from "./user";
import { getSiteSettings } from "./settings";
import { generateFullStaticImageUrl } from "./images";
import { finalCoversBucket } from "./minio";
import { Job } from "bullmq";
import { AppError } from "./error";
import {
  handleArtistGift,
  handleSubscription,
  handleTrackGroupPurchase,
} from "./handleFinishedTransactions";

const { STRIPE_KEY, API_DOMAIN } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

const calculatePlatformPercent = async (
  currency: string,
  percent?: number | null
) => {
  const settings = await getSiteSettings();
  if (currency.toLowerCase() === "brl") {
    return 0;
  }
  return (percent ?? settings.platformPercent) / 100;
};

export const calculateAppFee = async (
  price: number,
  currency: string,
  platformPercent?: number | null
) => {
  const appFee =
    price * (await calculatePlatformPercent(currency, platformPercent));
  return appFee || undefined;
};

export const createTrackGroupStripeProduct = async (
  trackGroup: Prisma.TrackGroupGetPayload<{
    include: { artist: true; cover: true };
  }>,
  stripeAccountId: string
) => {
  let productKey = trackGroup.stripeProductKey;

  const about =
    trackGroup.about && trackGroup.about !== ""
      ? trackGroup.about
      : `The album ${trackGroup.title} by ${trackGroup.artist.name}.`;
  if (!trackGroup.stripeProductKey) {
    const product = await stripe.products.create(
      {
        name: `${trackGroup.title} by ${trackGroup.artist.name}`,
        description: about,
        tax_code: "txcd_10401100",
        images: trackGroup.cover
          ? [
              generateFullStaticImageUrl(
                trackGroup.cover?.url[4],
                finalCoversBucket
              ),
            ]
          : [],
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    await prisma.trackGroup.update({
      where: {
        id: trackGroup.id,
      },
      data: {
        stripeProductKey: product.id,
      },
    });
    productKey = product.id;
  }

  return productKey;
};

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
        description: tier.description || "Thank you for your support!",
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

export const createStripeCheckoutSessionForPurchase = async ({
  loggedInUser,
  email,
  priceNumber,
  trackGroup,
  stripeAccountId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  trackGroup: Prisma.TrackGroupGetPayload<{
    include: { artist: true; cover: true };
  }>;
  stripeAccountId: string;
}) => {
  const client = await prisma.client.findFirst({});

  const productKey = await createTrackGroupStripeProduct(
    trackGroup,
    stripeAccountId
  );

  if (!productKey) {
    throw new AppError({
      description: "Was not able to create a product for user",
      httpCode: 500,
    });
  }

  const currency = trackGroup.currency?.toLowerCase() ?? "usd";

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(
          priceNumber,
          currency,
          trackGroup.platformPercent
        ),
      },
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: priceNumber,
            currency,
            product: productKey,
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        trackGroupId: trackGroup.id,
        artistId: trackGroup.artistId,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
      },
      mode: "payment",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
};

export const createStripeCheckoutSessionForTip = async ({
  loggedInUser,
  email,
  priceNumber,
  stripeAccountId,
  currency,
  artistId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  currency: string;
  stripeAccountId: string;
  artistId: number;
}) => {
  const client = await prisma.client.findFirst({});

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(priceNumber, currency),
      },
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: priceNumber,
            currency: currency?.toLowerCase() ?? "usd",
            product_data: { name: "Mirlo One Time Tip" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        artistId: artistId,
        gaveGift: 1,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
      },
      mode: "payment",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
};

export const createCheckoutSessionForSubscription = async ({
  loggedInUser,
  email,
  stripeAccountId,
  artistId,
  tier,
  amount,
}: {
  loggedInUser?: User;
  email?: string;
  stripeAccountId: string;
  artistId: number;
  tier: Prisma.ArtistSubscriptionTierGetPayload<{ include: { artist: true } }>;
  amount: number;
}) => {
  const client = await prisma.client.findFirst({});
  const productKey = await createSubscriptionStripeProduct(
    tier,
    stripeAccountId
  );
  if (!productKey) {
    throw new AppError({
      description: "Was not able to create a product for user",
      httpCode: 500,
    });
  }

  logger.info(`Created a new product for artist ${artistId}, ${productKey}`);
  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      subscription_data: {
        application_fee_percent: await calculatePlatformPercent(
          tier.currency,
          tier.platformPercent
        ),
      },
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: tier.allowVariable
              ? amount || (tier.minAmount ?? 0)
              : tier.minAmount ?? 0,
            currency: tier.currency ?? "USD",
            product: productKey,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        artistId,
        subscribed: 1,
        tierId: tier.id,
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
  return session;
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
      console.error(
        `⚠️  Webhook signature verification failed.`,
        (e as Error).message
      );
      return res.sendStatus(400);
    }
  }

  return event;
};

type SessionMetaData = {
  tierId: string;
  userEmail: string;
  userId: string;
  trackGroupId: string;
  stripeAccountId: string;
  gaveGift: string;
  artistId: string;
};

export const handleCheckoutSession = async (
  session: Stripe.Checkout.Session
) => {
  try {
    const metadata = session.metadata as unknown as SessionMetaData;
    const { tierId, trackGroupId, stripeAccountId, gaveGift, artistId } =
      metadata;
    let { userId, userEmail } = metadata;
    userEmail = userEmail || (session.customer_details?.email ?? "");
    logger.info(
      `checkout.session: ${session.id}, stripeAccountId: ${stripeAccountId}, tierId: ${tierId}, trackGroupId: ${trackGroupId}, artistId: ${artistId}, gaveGift: ${gaveGift}`
    );
    logger.info(
      `checkout.session: ${session.id}, have user info: userId: ${userId} userEmail: ${userEmail}`
    );
    session = await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: ["line_items"],
      },
      { stripeAccount: stripeAccountId }
    );

    // If the user doesn't exist, we create one with an existing userEmail
    let { userId: actualUserId, newUser } = await findOrCreateUserBasedOnEmail(
      userEmail,
      userId
    );
    logger.info(`checkout.session: ${session.id} Processing session`);
    if (gaveGift && `${gaveGift}` === "1" && artistId) {
      logger.info(`checkout.session: ${session.id} handling tip`);
      await handleArtistGift(Number(actualUserId), Number(artistId), session);
    } else if (tierId && userEmail) {
      logger.info(`checkout.session: ${session.id} handling subscription`);
      await handleSubscription(Number(actualUserId), Number(tierId), session);
    } else if (trackGroupId && actualUserId) {
      logger.info(`checkout.session: ${session.id} handleTrackGroupPurchase`);
      await handleTrackGroupPurchase(
        Number(actualUserId),
        Number(trackGroupId),
        session,
        newUser
      );
    }
  } catch (e) {
    console.error(e);
  }
};

export const handleInvoicePaid = async (invoice: Stripe.Invoice) => {
  const subscription = invoice.subscription;
  logger.info(`invoice.paid: ${invoice.id} for ${subscription}`);
  if (typeof subscription === "string") {
    const artistUserSubscription =
      await prisma.artistUserSubscription.findFirst({
        where: {
          stripeSubscriptionKey: subscription,
        },
        include: {
          user: true,
          artistSubscriptionTier: {
            include: {
              artist: true,
            },
          },
        },
      });
    if (artistUserSubscription) {
      logger.info(
        `invoice.paid: ${invoice.id} found subscription, sending receipt`
      );
      await sendMail({
        data: {
          template: "artist-subscription-receipt",
          message: {
            to: artistUserSubscription.user.email,
          },
          locals: {
            artist: artistUserSubscription.artistSubscriptionTier.artist,
            artistUserSubscription,
            host: process.env.API_DOMAIN,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
          },
        },
      } as Job);
    }
  }
};

export default stripe;
