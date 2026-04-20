import { Queue, QueueEvents, QueueOptions } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";
import { logger } from "../logger";
import { getSafeErrorContext } from "../utils/logging";

const queueOptions: QueueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
  defaultJobOptions: {
    // Keep Redis bounded while retaining enough history for troubleshooting.
    removeOnComplete: {
      age: 2 * 24 * 60 * 60,
      count: 1000,
    },
    removeOnFail: {
      age: 14 * 24 * 60 * 60,
      count: 5000,
    },
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10_000,
    },
  },
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

sendPostNotificationQueueEvents.on(
  "failed",
  async (result: { jobId: string; failedReason?: string; prev?: string }) => {
    try {
      const job = await sendPostNotificationQueue.getJob(result.jobId);
      const failedReason =
        result.failedReason || job?.failedReason || "unknown";
      const latestStack = job?.stacktrace?.[job.stacktrace.length - 1];

      logger.error("send-post-notification job failed", {
        jobId: result.jobId,
        previousState: result.prev,
        failedReason,
        attemptsMade: job?.attemptsMade,
        configuredAttempts: job?.opts?.attempts,
        stack: latestStack,
      });
    } catch (error) {
      logger.error("send-post-notification failed-event handling error", {
        jobId: result.jobId,
        ...getSafeErrorContext(error),
      });
    }
  }
);

sendPostNotificationQueueEvents.on("error", async (error) => {
  logger.error(
    "send-post-notification queue error",
    getSafeErrorContext(error)
  );
});
