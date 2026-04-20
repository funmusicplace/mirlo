import { logger } from "../logger";
import { REDIS_CONFIG } from "../config/redis";
import { Queue, QueueEvents, QueueOptions } from "bullmq";
import { getSafeErrorContext } from "../utils/logging";

const queueOptions: QueueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
  defaultJobOptions: {
    // Keep Redis bounded while retaining enough history for troubleshooting.
    removeOnComplete: {
      age: 2 * 24 * 60 * 60,
      count: 3000,
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

export const sendMailQueue = new Queue("send-mail", queueOptions);

export const sendMailQueueEvents = new QueueEvents("send-mail", queueOptions);

sendMailQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );

    try {
      logger.info("sendMail: done sending email");
    } catch (err) {
      logger.error(`sendMailQueueEvents.completed ${JSON.stringify(err)}`);
    }
  }
);

sendMailQueueEvents.on("stalled", async (result: { jobId: string }) => {
  logger.info(`jobId ${result.jobId} stalled: Marking audio as error`);

  try {
    const job = await sendMailQueue.getJob(result.jobId);
    if (job) {
      logger.info("send email");
    }
  } catch (err) {
    logger.error(`sendMailQueueEvents.stalled ${JSON.stringify(err)}`);
  }
});

sendMailQueueEvents.on("error", async (error) => {
  logger.error("send-mail queue error", getSafeErrorContext(error));
});
