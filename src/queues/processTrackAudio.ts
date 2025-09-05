import { Request, Response } from "express";
import { Queue, QueueEvents } from "bullmq";

import { REDIS_CONFIG } from "../config/redis";

import prisma from "@mirlo/prisma";
import { logger } from "../logger";
import {
  createBucketIfNotExists,
  incomingAudioBucket,
  uploadWrapper,
} from "../utils/minio";
import { verifyAudioQueue } from "./verify-audio-queue";

export const buildTrackStreamURL = (trackId: number) => {
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

        logger.info(`audioId: ${audio.id} updated trackAudio`);

        await verifyAudioQueue.add("verify-audio", {
          audioId: audio.id,
          fileExtension: audio.fileExtension,
        });
        logger.info(`audioId: ${audio.id} sent to verifyAudioQueue`);
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

export const startAudioQueueForTrack = async (trackId: number) => {
  const track = await prisma.track.findFirst({
    where: {
      id: trackId,
    },
    include: {
      audio: true,
    },
  });

  if (track && track.audio && track.audio.uploadState !== "SUCCESS") {
    const job = await audioQueue.add("upload-audio", {
      audioId: track.audio.id,
      fileExtension: track.audio.fileExtension,
    });
    logger.info(`trackId: ${track.id} sent to audioQueue with jobId ${job.id}`);

    return job;
  } else {
    logger.info(
      `trackId: ${trackId} not sent to audioQueue - no audio or already uploaded`
    );
  }
};

/*
 * Process an audio then queue it for upload
 * FIXME: convert this to be stream based.
 */
export const processTrackAudio = (ctx: { req: Request; res: Response }) => {
  return async (trackId: number) => {
    logger.info("Uploading trackAudio to temporary storage");

    await createBucketIfNotExists(incomingAudioBucket, logger);

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
          `Going to put a file on ${incomingAudioBucket}/${audio.id}: ${fileInfo.filename}`
        );
        await uploadWrapper(incomingAudioBucket, audio.id, fileStream);

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
