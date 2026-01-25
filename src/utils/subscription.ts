import prisma from "@mirlo/prisma";
import { logger } from "../logger";
import sendMail from "../jobs/send-mail";

import { Job } from "bullmq";
import { Artist } from "@mirlo/prisma/client";
import { sendMailQueue } from "../queues/send-mail-queue";

export type ArtistSubscriptionReceiptEmailType = {
  interval: "MONTH" | "YEAR";
  artist: Artist;
  host: string;
  client: string;
  artistUserSubscription: {
    id: number;
    createdAt: Date;
    updatedAt: Date;
  };
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
}: {
  processorPaymentReferenceId: string;
  processorSubscriptionReferenceId: string;
  amountPaid: number;
  currency: string;
  platformCut: number;
  paymentProcessorFee: number;
  status: "FAILED" | "COMPLETED";
  urlParams?: string;
}) => {
  const artistUserSubscription = await prisma.artistUserSubscription.findFirst({
    where: {
      stripeSubscriptionKey: processorSubscriptionReferenceId,
      deletedAt: null,
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

    logger.info(
      `invoice.paid: ${processorPaymentReferenceId} found subscription, sending receipt`
    );
    if (status === "COMPLETED") {
      await sendMailQueue.add("send-mail", {
        template: "artist-subscription-receipt",
        message: {
          to: artistUserSubscription.user.email,
        },
        locals: {
          interval: artistUserSubscription.artistSubscriptionTier.interval,
          artist: artistUserSubscription.artistSubscriptionTier.artist,
          artistUserSubscription,
          host: process.env.API_DOMAIN,
          client: process.env.REACT_APP_CLIENT_DOMAIN,
        } as ArtistSubscriptionReceiptEmailType,
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
          client: process.env.REACT_APP_CLIENT_DOMAIN,
          urlParams,
        },
      });
    }
  }
};
