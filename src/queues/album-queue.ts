import { Queue, QueueEvents } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";
import { logger } from "../logger";
import prisma from "@mirlo/prisma";
import { Track, TrackAudio, TrackGroup } from "@mirlo/prisma/client";
import { trackFormatBucket, trackGroupFormatBucket } from "../utils/minio";

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const generateAlbumQueue = new Queue("generate-album", queueOptions);

const generateAlbumQueueEvents = new QueueEvents(
  "generate-album",
  queueOptions
);

generateAlbumQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );

    try {
      const job = await generateAlbumQueue.getJob(result.jobId);
      logger.info("generate album job result:", result.returnvalue);
      if (result.returnvalue?.error) {
        logger.error(
          `There was an error processing the job, ${JSON.stringify(
            result.returnvalue?.error
          )}`
        );
      } else if (job) {
        logger.info("Done generating album");
      }
    } catch (err) {
      logger.error(
        `generateAlbumQueueEvents.completed error: ${JSON.stringify(err)}`
      );
    }
  }
);

generateAlbumQueueEvents.on("stalled", async (result: { jobId: string }) => {
  logger.info(`jobId ${result.jobId} stalled: Marking audio as error`);

  try {
    const job = await generateAlbumQueue.getJob(result.jobId);
    if (job) {
      console.log("job details", job);
    }
  } catch (err) {
    logger.error(`generateAlbumQueueEvents.stalled: ${JSON.stringify(err)}`);
  }
});

generateAlbumQueueEvents.on("error", async (error) => {
  logger.error(`jobId ${JSON.stringify(error)} had an error`);
});

export const startGeneratingZip = async (
  trackGroup: TrackGroup & { tracks: Track[] },
  tracks: (Track & { audio: TrackAudio | null })[],
  format: string,
  destinationBucket:
    | typeof trackFormatBucket
    | typeof trackGroupFormatBucket = trackGroupFormatBucket
) => {
  const job = await generateAlbumQueue.add("generate-album", {
    trackGroup,
    tracks,
    format,
    destinationBucket,
  });

  return job.id;
};
