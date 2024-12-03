import { Queue, QueueEvents } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";
import { logger } from "../logger";

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const verifyAudioQueue = new Queue("verify-audio", queueOptions);

const verifyAudioQueueEvents = new QueueEvents("verify-audio", queueOptions);

verifyAudioQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );
  }
);

verifyAudioQueueEvents.on("stalled", async (result: { jobId: string }) => {
  logger.info(`jobId ${result.jobId} stalled: Marking audio as error`);

  try {
    const job = await verifyAudioQueue.getJob(result.jobId);
    logger.info("job", job);
  } catch (err) {
    logger.error(`verifyTrackQueueEvents.stalled: ${JSON.stringify(err)}`);
  }
});

verifyAudioQueueEvents.on("error", async (error) => {
  logger.error(`jobId ${JSON.stringify(error)} had an error`);
});

export const startVerifyingAudio = async (
  audioId: string,
  fileExtension: string
) => {
  const job = await verifyAudioQueue.add("verify-audio", {
    audioId,
    fileExtension,
  });

  return job.id;
};
