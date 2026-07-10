import prisma from "@mirlo/prisma";
import { Profile } from "@mirlo/prisma/client";

import { logger } from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";

import { getClient } from "./getClient";
import { resolvePayee } from "./payments/payee";
import { grantSubscriptionTierReleases } from "./subscriptionTier";

export type ArtistSubscriptionReceiptEmailType = {
  interval: "MONTH" | "YEAR";
  artist: Profile;
  host: string;
  isNewSubscription: boolean;
  client: string;
  profileUserSubscription: {
    id: number;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type ArtistNewSubscriberAnnounceEmailType = {
  interval: "MONTH" | "YEAR";
  artist: Profile;
  isNewSubscription: boolean;
  profileUserSubscription: {
    profileSubscriptionTierId: number;
    id: number;
    amount: number;
    profileSubscriptionTier: {
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
  const profileUserSubscription =
    await prisma.profileUserSubscription.findFirst({
      where: {
        stripeSubscriptionKey: processorSubscriptionReferenceId,
        deletedAt: null,
      },
      include: {
        user: true,
        profileSubscriptionTier: {
          include: {
            profile: {
              include: {
                user: true,
                paymentToUser: true,
              },
            },
          },
        },
      },
    });
  if (profileUserSubscription) {
    const tier = profileUserSubscription.profileSubscriptionTier;
    const artistProfile =
      tier.profile ??
      (await prisma.profile.findFirstOrThrow({
        where: { id: tier.profileId },
        include: { user: true, paymentToUser: true },
      }));

    const transaction = await prisma.userTransaction.create({
      data: {
        userId: profileUserSubscription.userId,
        amount: amountPaid,
        currency,
        platformCut,
        stripeId: processorPaymentReferenceId,
        stripeCut: paymentProcessorFee,
        paymentStatus: status,
      },
    });
    const created = await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: profileUserSubscription.id,
        transactionId: transaction.id,
      },
    });
    logger.info(
      `invoice.paid: ${processorPaymentReferenceId} created subscription charge: ${created.id}`
    );

    // Update next billing date if provided
    if (status === "COMPLETED" && nextBillingDate) {
      await prisma.profileUserSubscription.update({
        where: { id: profileUserSubscription.id },
        data: { nextBillingDate },
      });

      if (isNewSubscription) {
        const grantedCount = await grantSubscriptionTierReleases({
          userId: profileUserSubscription.userId,
          tierId: profileUserSubscription.profileSubscriptionTierId,
          userTransactionId: transaction.id,
        });
        if (grantedCount > 0) {
          logger.info(
            `invoice.paid: ${processorPaymentReferenceId} has ${grantedCount} pro grata track groups, granting access`
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
          to: profileUserSubscription.user.email,
        },
        locals: {
          isNewSubscription,
          interval: tier.interval,
          artist: artistProfile,
          profileUserSubscription,
          host: process.env.API_DOMAIN,
          client: client.applicationUrl,
        } as ArtistSubscriptionReceiptEmailType,
      });

      // Notify the artist (or payment-to user if set) of the subscription payment/renewal.
      // Renewals are skipped when the notification *recipient* opted into
      // combining subscription emails into the monthly income report; new
      // subscribers are always announced.
      const payee = resolvePayee({
        artist: artistProfile,
      });

      const shouldNotifyArtist =
        isNewSubscription || !payee.combineSubscriptionEmails;

      if (shouldNotifyArtist) {
        await sendMailQueue.add("send-mail", {
          template: "artist-new-subscriber-announce",
          message: {
            to: payee.email,
            cc: payee.accountingEmail,
          },
          locals: {
            isNewSubscription,
            interval: tier.interval,
            artist: artistProfile,
            profileUserSubscription: {
              id: profileUserSubscription.id,
              amount: profileUserSubscription.amount,
              profileSubscriptionTierId:
                profileUserSubscription.profileSubscriptionTierId,
              profileSubscriptionTier: {
                name: tier.name,
              },
            },
            user: {
              name: profileUserSubscription.user.name || "A supporter",
              email: profileUserSubscription.user.email,
            },
            transaction: {
              amount: transaction.amount,
              currency: transaction.currency,
              platformCut: transaction.platformCut ?? 0,
              stripeCut: transaction.stripeCut ?? 0,
            },
            email: profileUserSubscription.user.email,
            host: process.env.API_DOMAIN,
            client: client.applicationUrl,
          } as ArtistNewSubscriberAnnounceEmailType,
        });
      }
    } else if (urlParams && status === "FAILED") {
      await sendMailQueue.add("send-mail", {
        template: "charge-failure",
        message: {
          to: profileUserSubscription.user.email,
        },
        locals: {
          artist: artistProfile,
          email: encodeURIComponent(profileUserSubscription.user.email),
          host: process.env.API_DOMAIN,
          cardChargeContext: `your subscription to "${artistProfile.name}'s ${tier.name}" tier`,
          currency: transaction.currency,
          pledgedAmountFormatted: profileUserSubscription.amount / 100,
          client: client.applicationUrl,
          urlParams,
        },
      });
    }
  }
};
