import Stripe from "stripe";
import prisma from "../../prisma/prisma";
import { Prisma, TrackGroup, User } from "@prisma/client";
import { logger } from "../logger";
import sendMail from "../jobs/send-mail";
import { Request, Response } from "express";
import { registerPurchase } from "./trackGroup";
import { registerSubscription } from "./subscriptionTier";
import { findOrCreateUserBasedOnEmail } from "./user";
import { getSiteSettings } from "./settings";
import { generateFullStaticImageUrl } from "./images";
import { finalCoversBucket } from "./minio";

const { STRIPE_KEY, API_DOMAIN } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

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
  productKey,
  stripeAccountId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  trackGroup: TrackGroup;
  productKey: string;
  stripeAccountId: string;
}) => {
  const settings = await getSiteSettings();
  const client = await prisma.client.findFirst({});

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount:
          (priceNumber *
            (trackGroup.platformPercent ?? settings.platformPercent)) /
          100,
      },
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: priceNumber,
            currency: trackGroup.currency?.toLowerCase() ?? "usd",
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

export const handleTrackGroupPurchase = async (
  userId: number,
  trackGroupId: number,
  session?: Stripe.Checkout.Session,
  newUser?: boolean
) => {
  try {
    const purchase = await registerPurchase({
      userId: Number(userId),
      trackGroupId: Number(trackGroupId),
      pricePaid: session?.amount_total ?? 0,
      currencyPaid: session?.currency ?? "USD",
      paymentProcessorKey: session?.id ?? null,
    });

    const settings = await getSiteSettings();

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
            platformCut:
              ((trackGroup.platformPercent ?? settings.platformPercent) *
                pricePaid) /
              100,
            email: user.email,
          },
        },
      });
    }

    return purchase;
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

      await sendMail({
        data: {
          template: "artist-new-subscriber-announce",
          message: {
            to: artistUserSubscription.artistSubscriptionTier.artist.user.email,
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
    `checkout.session: ${session.id}, stripeAccountId: ${stripeAccountId}, tierId: ${tierId}, trackGroupId: ${trackGroupId}`
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
  if (tierId && userEmail) {
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
      });
    }
  }
};

export default stripe;
