import { Queue, QueueEvents } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";
import { logger } from "../logger";

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const sendPostNotificationQueue = new Queue(
  "send-post-notification",
  queueOptions
);

export const sendPostNotificationQueueEvents = new QueueEvents(
  "send-post-notification",
  queueOptions
);

sendPostNotificationQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );
  }
);

sendPostNotificationQueueEvents.on(
  "stalled",
  async (result: { jobId: string }) => {
    logger.info(`jobId ${result.jobId} stalled`);
  }
);

sendPostNotificationQueueEvents.on("failed", async (result: any) => {
  logger.error(`jobId ${result.jobId} failed:`, result.failedReason);
});

sendPostNotificationQueueEvents.on("error", async (error) => {
  logger.error(`send-post-notification queue error:`, error);
});
