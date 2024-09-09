import Stripe from "stripe";
import prisma from "@mirlo/prisma";

import { logger } from "../logger";
import sendMail from "../jobs/send-mail";
import { registerPurchase } from "./trackGroup";
import { registerSubscription } from "./subscriptionTier";
import { getSiteSettings } from "./settings";
import { Job } from "bullmq";
import { calculateAppFee } from "./stripe";

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
      } as Job);

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
      } as Job);
    }

    return purchase;
  } catch (e) {
    logger.error(`Error creating album purchase: ${e}`);
  }
};

export const handleArtistGift = async (
  userId: number,
  artistId: number,
  session?: Stripe.Checkout.Session
) => {
  try {
    await prisma.userArtistTip.create({
      data: {
        userId,
        artistId,
        pricePaid: session?.amount_total ?? 0,
        currencyPaid: session?.currency ?? "USD",
        stripeSessionKey: session?.id ?? null,
      },
    });

    const tip = await prisma.userArtistTip.findFirst({
      where: {
        artistId,
        userId,
      },
      include: { artist: { include: { user: true } } },
    });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (user && tip) {
      const pricePaid = tip.pricePaid / 100;

      await sendMail({
        data: {
          template: "artist-tip-receipt",
          message: {
            to: user.email,
          },
          locals: {
            tip,
            email: user.email,
            pricePaid,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          },
        },
      } as Job);

      const platformCut = await calculateAppFee(pricePaid, tip.currencyPaid);

      await sendMail({
        data: {
          template: "tip-artist-notification",
          message: {
            to: tip.artist.user.email,
          },
          locals: {
            tip,
            pricePaid,
            platformCut,
            email: user.email,
          },
        },
      } as Job);
    }

    return tip;
  } catch (e) {
    logger.error(`Error creating tip: ${e}`);
    throw e;
  }
};

export const handleSubscription = async (
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
      } as Job);

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
      } as Job);
    }
  } catch (e) {
    logger.error(`Error creating subscription: ${e}`);
  }
};
