import { Request, Response } from "express";
import { Queue, QueueEvents } from "bullmq";

import { REDIS_CONFIG } from "../config/redis";

import prisma from "../../prisma/prisma";
import { logger } from "../logger";
import { createBucketIfNotExists, incomingAudioBucket } from "./minio";
import { minioClient } from "./minio";

const { MINIO_HOST = "", MINIO_API_PORT = 9000 } = process.env;

const buildTrackStreamURL = (trackId: number) => {
  return `/v1/tracks/${trackId}/stream/playlist.m3u8`;
};

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const audioQueue = new Queue("upload-audio", queueOptions);

const audioQueueEvents = new QueueEvents("upload-audio", queueOptions);

audioQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );

    try {
      const job = await audioQueue.getJob(result.jobId);
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
      logger.error(`audioQueueEvents.completed ${JSON.stringify(err)}`);
    }
  }
);

audioQueueEvents.on("stalled", async (result: { jobId: string }) => {
  logger.info(`jobId ${result.jobId} stalled: Marking audio as error`);

  try {
    const job = await audioQueue.getJob(result.jobId);
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
    logger.error(`audioQueueEvents.stalled ${JSON.stringify(err)}`);
  }
});

audioQueueEvents.on("error", async (error) => {
  logger.error(`jobId ${JSON.stringify(error)} had an error`);
});

/*
 * Process an audio then queue it for upload
 * FIXME: convert this to be stream based.
 */
export const processTrackAudio = (ctx: { req: Request; res: Response }) => {
  return async (trackId: number) => {
    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_API_PORT}`);
    logger.info("Uploading trackAudio to temporary storage");

    await createBucketIfNotExists(minioClient, incomingAudioBucket, logger);

    ctx.req.pipe(ctx.req.busboy);

    const jobId = await new Promise((resolve, reject) => {
      ctx.req.busboy.on("file", async (_fieldname, fileStream, fileInfo) => {
        const extension = fileInfo.filename.split(".").pop();
        const audio = await prisma.trackAudio.upsert({
          create: {
            trackId,
            url: buildTrackStreamURL(trackId),
            originalFilename: fileInfo.filename,
            fileExtension: extension,
            uploadState: "STARTED",
          },
          update: {
            trackId,
            originalFilename: fileInfo.filename,
            url: buildTrackStreamURL(trackId),
            fileExtension: extension,
            uploadState: "STARTED",
          },
          where: {
            trackId: Number(trackId),
          },
        });

        logger.info(
          `Going to put a file on MinIO Bucket ${incomingAudioBucket}: ${audio.id}, ${fileInfo.filename}`
        );
        await minioClient.putObject(incomingAudioBucket, audio.id, fileStream);

        logger.info("Adding audio to upload-audio queue");
        const job = await audioQueue.add("upload-audio", {
          audioId: audio.id,
          fileExtension: audio.fileExtension,
        });
        resolve(job.id);
      });
    });
    return jobId;
  };
};

export default processTrackAudio;
