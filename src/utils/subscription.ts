import prisma from "@mirlo/prisma";
import { logger } from "../logger";
import sendMail from "../jobs/send-mail";

import { Job } from "bullmq";
import { Artist } from "@mirlo/prisma/client";
import { sendMailQueue } from "../queues/send-mail-queue";
import { getClient } from "../activityPub/utils";

export type ArtistSubscriptionReceiptEmailType = {
  interval: "MONTH" | "YEAR";
  artist: Artist;
  host: string;
  isNewSubscription: boolean;
  client: string;
  artistUserSubscription: {
    id: number;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type ArtistNewSubscriberAnnounceEmailType = {
  interval: "MONTH" | "YEAR";
  artist: Artist;
  isNewSubscription: boolean;
  artistUserSubscription: {
    artistSubscriptionTierId: number;
    id: number;
    amount: number;
    currency: string;
    artistSubscriptionTier: {
      name: string;
    };
  };
  user: {
    name: string;
    email: string;
  };
  transaction?: {
    amount: number;
    currency: string;
    platformCut: number | null;
    stripeCut: number | null;
  };
  email: string;
  client: string;
  host: string;
};

/**
 * We'll probably want to change this to be more neutral. Right now we assume the payment processor is Stripe.
 * @param processorPaymentReferenceId
 * @param processorSubscriptionReferenceId
 */
export const manageSubscriptionReceipt = async ({
  processorPaymentReferenceId,
  processorSubscriptionReferenceId,
  amountPaid,
  currency,
  platformCut,
  paymentProcessorFee,
  status,
  urlParams,
  nextBillingDate,
  billingReason,
}: {
  processorPaymentReferenceId: string;
  processorSubscriptionReferenceId: string;
  amountPaid: number;
  currency: string;
  platformCut: number;
  paymentProcessorFee: number;
  status: "FAILED" | "COMPLETED";
  urlParams?: string;
  nextBillingDate?: Date;
  billingReason: null | string;
}) => {
  const isNewSubscription = billingReason === "subscription_create";
  const artistUserSubscription = await prisma.artistUserSubscription.findFirst({
    where: {
      stripeSubscriptionKey: processorSubscriptionReferenceId,
      deletedAt: null,
    },
    include: {
      user: true,
      artistSubscriptionTier: {
        include: {
          artist: {
            include: {
              user: true,
              paymentToUser: true,
            },
          },
        },
      },
    },
  });
  if (artistUserSubscription) {
    const transaction = await prisma.userTransaction.create({
      data: {
        userId: artistUserSubscription.userId,
        amount: amountPaid,
        currency,
        platformCut,
        stripeId: processorPaymentReferenceId,
        stripeCut: paymentProcessorFee,
        paymentStatus: status,
      },
    });
    const created = await prisma.artistUserSubscriptionCharge.create({
      data: {
        artistUserSubscriptionId: artistUserSubscription.id,
        transactionId: transaction.id,
      },
    });
    logger.info(
      `invoice.paid: ${processorPaymentReferenceId} created subscription charge: ${created.id}`
    );

    // Update next billing date if provided
    if (status === "COMPLETED" && nextBillingDate) {
      await prisma.artistUserSubscription.update({
        where: { id: artistUserSubscription.id },
        data: { nextBillingDate },
      });

      if (isNewSubscription) {
        const hasProGrataTrackGroups =
          await prisma.subscriptionTierRelease.findMany({
            where: {
              tierId: artistUserSubscription.artistSubscriptionTierId,
            },
          });
        if (hasProGrataTrackGroups.length > 0) {
          logger.info(
            `invoice.paid: ${processorPaymentReferenceId} has ${hasProGrataTrackGroups.length} pro grata track groups, granting access`
          );
          await Promise.all(
            hasProGrataTrackGroups.map((release) =>
              prisma.userTrackGroupPurchase.upsert({
                where: {
                  userId_trackGroupId: {
                    userId: artistUserSubscription.userId,
                    trackGroupId: release.trackGroupId,
                  },
                },
                update: {},
                create: {
                  userId: artistUserSubscription.userId,
                  trackGroupId: release.trackGroupId,
                  userTransactionId: transaction.id ?? undefined,
                  createdAt: new Date(),
                  proGratis: true,
                },
              })
            )
          );
        }
      }
    }

    logger.info(
      `invoice.paid: ${processorPaymentReferenceId} found subscription, sending receipt`
    );

    const client = await getClient();
    if (status === "COMPLETED") {
      await sendMailQueue.add("send-mail", {
        template: "artist-subscription-receipt",
        message: {
          to: artistUserSubscription.user.email,
        },
        locals: {
          isNewSubscription,
          interval: artistUserSubscription.artistSubscriptionTier.interval,
          artist: artistUserSubscription.artistSubscriptionTier.artist,
          artistUserSubscription,
          host: process.env.API_DOMAIN,
          client: client.applicationUrl,
        } as ArtistSubscriptionReceiptEmailType,
      });

      // Notify the artist (or payment-to user if set) of the subscription payment/renewal
      const artistNotificationEmail =
        artistUserSubscription.artistSubscriptionTier.artist.paymentToUser
          ?.email ??
        artistUserSubscription.artistSubscriptionTier.artist.user.email;

      await sendMailQueue.add("send-mail", {
        template: "artist-new-subscriber-announce",
        message: {
          to: artistNotificationEmail,
          cc:
            artistUserSubscription.artistSubscriptionTier.artist.paymentToUser
              ?.accountingEmail ??
            artistUserSubscription.artistSubscriptionTier.artist.user
              .accountingEmail,
        },
        locals: {
          isNewSubscription,
          interval: artistUserSubscription.artistSubscriptionTier.interval,
          artist: artistUserSubscription.artistSubscriptionTier.artist,
          artistUserSubscription: {
            id: artistUserSubscription.id,
            amount: artistUserSubscription.amount,
            currency: artistUserSubscription.currency,
            artistSubscriptionTierId:
              artistUserSubscription.artistSubscriptionTierId,
            artistSubscriptionTier: {
              name: artistUserSubscription.artistSubscriptionTier.name,
            },
          },
          user: {
            name: artistUserSubscription.user.name || "A supporter",
            email: artistUserSubscription.user.email,
          },
          transaction: {
            amount: transaction.amount,
            currency: transaction.currency,
            platformCut: transaction.platformCut ?? 0,
            stripeCut: transaction.stripeCut ?? 0,
          },
          email: artistUserSubscription.user.email,
          host: process.env.API_DOMAIN,
          client: client.applicationUrl,
        } as ArtistNewSubscriberAnnounceEmailType,
      });
    } else if (urlParams && status === "FAILED") {
      await sendMailQueue.add("send-mail", {
        template: "charge-failure",
        message: {
          to: artistUserSubscription.user.email,
        },
        locals: {
          artist: artistUserSubscription.artistSubscriptionTier.artist,
          email: encodeURIComponent(artistUserSubscription.user.email),
          host: process.env.API_DOMAIN,
          cardChargeContext: `your subscription to "${artistUserSubscription.artistSubscriptionTier.artist.name}'s ${artistUserSubscription.artistSubscriptionTier.name}" tier`,
          currency: artistUserSubscription.currency,
          pledgedAmountFormatted: artistUserSubscription.amount / 100,
          client: client.applicationUrl,
          urlParams,
        },
      });
    }
  }
};
