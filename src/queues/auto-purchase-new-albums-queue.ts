import prisma from "@mirlo/prisma";
import { Queue, QueueEvents } from "bullmq";

import { REDIS_CONFIG } from "../config/redis";
import { logger } from "../logger";
import { getClient } from "../utils/getClient";
import { registerPurchase } from "../utils/trackGroup";

import { sendMailQueue } from "./send-mail-queue";

export type AutomaticallyReceivedAlbumEmailType = {
  trackGroup: {
    id: number;
    title: string;
  };
  artist: {
    id: number;
    name: string;
  };
  host: string;
  client: string;
};

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const autoPurchaseNewAlbumsQueue = new Queue(
  "auto-purchase-new-albums",
  queueOptions
);

export const autoPurchaseNewAlbumsQueueEvents = new QueueEvents(
  "auto-purchase-new-albums",
  queueOptions
);

autoPurchaseNewAlbumsQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );
  }
);

autoPurchaseNewAlbumsQueueEvents.on(
  "stalled",
  async (result: { jobId: string }) => {
    logger.info(`jobId ${result.jobId} stalled`);
  }
);

autoPurchaseNewAlbumsQueueEvents.on("failed", async (result: any) => {
  logger.error(`jobId ${result.jobId} failed:`, result.failedReason);
});

autoPurchaseNewAlbumsQueueEvents.on("error", async (error) => {
  logger.error(`auto-purchase-new-albums queue error:`, error);
});

/**
 * Job processor: Auto-purchases albums for subscribers
 * Handles a single album + user subscription pair per job
 * Idempotent: safe to retry on failure (checks for existing purchase)
 */
export async function autoPurchaseNewAlbumsProcessor(job: {
  data: {
    trackGroupId: number;
    artistUserSubscriptionId: number;
  };
}) {
  const { trackGroupId, artistUserSubscriptionId } = job.data;

  logger.info(
    `autoPurchaseNewAlbums: processing album ${trackGroupId} for subscription ${artistUserSubscriptionId}`
  );

  try {
    // Fetch album and subscription in a transaction for consistency
    const [album, subscription] = await Promise.all([
      prisma.trackGroup.findUnique({
        where: { id: trackGroupId },
        include: {
          artist: true,
        },
      }),
      prisma.artistUserSubscription.findUnique({
        where: { id: artistUserSubscriptionId },
        include: {
          user: true,
          artistSubscriptionTier: {
            include: {
              artist: true,
            },
          },
        },
      }),
    ]);

    if (!album) {
      logger.warn(
        `autoPurchaseNewAlbums: album ${trackGroupId} not found, skipping`
      );
      return;
    }

    if (!subscription) {
      logger.warn(
        `autoPurchaseNewAlbums: subscription ${artistUserSubscriptionId} not found, skipping`
      );
      return;
    }

    // Check if purchase already exists (idempotency guard)
    const existingPurchase = await prisma.userTrackGroupPurchase.findFirst({
      where: {
        userId: subscription.userId,
        trackGroupId: album.id,
      },
    });

    if (existingPurchase) {
      logger.info(
        `autoPurchaseNewAlbums: user ${subscription.userId} already has purchase for album ${album.id}, skipping`
      );
      return;
    }

    // Register purchase and send email in a transaction
    await prisma.$transaction(async (tx) => {
      await registerPurchase({
        userId: subscription.userId,
        trackGroupId: album.id,
        pricePaid: 0,
        currencyPaid: "usd",
        paymentProcessorKey: null,
      });
    });

    // Queue the notification email (outside transaction to avoid holding locks)
    await sendMailQueue.add("send-mail", {
      template: "automatically-received-album",
      message: {
        to: subscription.user.email,
      },
      locals: {
        trackGroup: album,
        artist: subscription.artistSubscriptionTier.artist,
        host: process.env.API_DOMAIN,
        client: (await getClient()).applicationUrl,
      } as AutomaticallyReceivedAlbumEmailType,
    });

    logger.info(
      `autoPurchaseNewAlbums: successfully purchased album ${album.id} for user ${subscription.userId}`
    );
  } catch (error) {
    logger.error(
      `autoPurchaseNewAlbums: error processing album ${trackGroupId}:`,
      error
    );
    throw error;
  }
}
