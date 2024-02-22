import { Request, Response } from "express";
import { Queue, QueueEvents, Worker } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";
import { logger } from "../logger";
import prisma from "../../prisma/prisma";
import generateAlbumJob from "../jobs/generate-album";
import { Track, TrackGroup } from "@prisma/client";

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
      if (result.returnvalue.error) {
        console.error("There was an error processing the job");
      } else if (job) {
        const audio = await prisma.trackAudio.update({
          where: {
            id: job.data.audioId,
          },
          data: {
            uploadState: "SUCCESS",
            duration:
              typeof result.returnvalue?.duration === "number"
                ? result.returnvalue.duration
                : null,
          },
        });

        if (audio && audio.trackId) {
          await prisma.track.update({
            where: {
              id: audio.trackId,
            },
            data: {
              metadata: result.returnvalue,
            },
          });
        }
        logger.info("updated trackAudio");
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
      await prisma.trackAudio.update({
        where: {
          id: job.data.audioId,
        },
        data: {
          uploadState: "ERROR",
        },
      });

      logger.info("Updated trackAudio");
    }
  } catch (err) {
    logger.error(`generateAlbumQueueEvents.stalled: ${JSON.stringify(err)}`);
  }
});

generateAlbumQueueEvents.on("error", async (error) => {
  logger.error(`jobId ${JSON.stringify(error)} had an error`);
});

export const startGeneratingAlbum = async (
  trackGroup: TrackGroup,
  format: string,
  tracks: Track[]
) => {
  const job = await generateAlbumQueue.add("generate-album", {
    trackGroup,
    format,
    tracks,
  });

  return job.id;
};
