import { Queue, QueueEvents } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";
import { logger } from "../logger";
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
      logger.info("job details", job);
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
  const jobKey = `${trackGroup.id}-${format}`;

  // Check if a job for this trackGroup/format combination is already pending or active
  const existingJobs = await generateAlbumQueue.getJobs(
    ["active", "waiting", "delayed"],
    0,
    -1
  );

  const duplicateJob = existingJobs.find((job) => {
    const jobData = job.data as any;
    return (
      jobData.trackGroup?.id === trackGroup.id && jobData.format === format
    );
  });

  if (duplicateJob) {
    logger.info(
      `Job for trackGroup ${trackGroup.id} format ${format} already queued (jobId: ${duplicateJob.id}). Returning existing job.`
    );
    return duplicateJob.id;
  }

  const job = await generateAlbumQueue.add(
    "generate-album",
    {
      trackGroup,
      tracks,
      format,
      destinationBucket,
    },
    { deduplication: { id: jobKey, ttl: 5000 } }
  );

  logger.info(
    `Created new generate-album job ${job.id} for trackGroup ${trackGroup.id} format ${format}`
  );

  return job.id;
};
