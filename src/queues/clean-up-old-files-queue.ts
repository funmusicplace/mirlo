import { Queue, QueueEvents } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";
import { logger } from "../logger";

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const cleanUpOldFilesQueue = new Queue(
  "clean-up-old-files",
  queueOptions
);

export const cleanUpOldFilesEvents = new QueueEvents(
  "clean-up-old-files",
  queueOptions
);

cleanUpOldFilesEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );
  }
);

cleanUpOldFilesEvents.on("stalled", async (result: { jobId: string }) => {
  logger.info(`jobId ${result.jobId} stalled: that's a bummer`);
});

cleanUpOldFilesEvents.on("error", async (error) => {
  logger.error(`jobId ${JSON.stringify(error)} had an error`);
});

export const startCleaningUpOldFiles = async () => {
  const job = await cleanUpOldFilesQueue.add("clean-up-old-files", {});

  return job.id;
};
