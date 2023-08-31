import { Request, Response } from "express";
import { Queue, QueueEvents } from "bullmq";
import { promises as fs } from "fs";
import shasum from "shasum";

import {
  // FIXME: HIGH_RES_AUDIO_MIME_TYPES,
  SUPPORTED_AUDIO_MIME_TYPES,
} from "../config/supported-media-types";
import { REDIS_CONFIG } from "../config/redis";

import prisma from "../../prisma/prisma";
import { logger } from "../logger";
import { checkFileType } from "./file";
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

export const audioQueue = new Queue("convert-audio", queueOptions);

const audioQueueEvents = new QueueEvents("convert-audio", queueOptions);

audioQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(result.jobId)} has been completed`
    );

    try {
      const job = await audioQueue.getJob(result.jobId);
      if (job) {
        await prisma.trackAudio.update({
          where: {
            id: job.data.audioId,
          },
          data: {
            duration:
              typeof result.returnvalue?.duration === "number"
                ? result.returnvalue.duration
                : null,
          },
        });
        logger.info("updated trackAudio");
      }
    } catch (err) {
      logger.error(err);
    }
  }
);

/*
 * Process an audio then queue it for upload
 */
export const processTrackAudio = (ctx: { req: Request; res: Response }) => {
  return async (file: any, trackId: number) => {
    const fileType = await checkFileType(ctx, file, SUPPORTED_AUDIO_MIME_TYPES);

    const buffer = await fs.readFile(file.path);
    const sha1sum = shasum(buffer);
    const audio = await prisma.trackAudio.upsert({
      create: {
        trackId,
        url: buildTrackStreamURL(trackId),
        originalFilename: file.originalFilename,
        size: file.size,
        hash: sha1sum,
        fileExtension: fileType.ext,
      },
      update: {
        trackId,
        originalFilename: file.originalFilename,
        url: buildTrackStreamURL(trackId),
        size: file.size,
        hash: sha1sum,
        fileExtension: fileType.ext,
      },
      where: {
        trackId: Number(trackId),
      },
    });

    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_API_PORT}`);
    logger.info("Uploading trackAudio to temporary storage");

    await createBucketIfNotExists(minioClient, incomingAudioBucket, logger);
    logger.info(
      `Going to put a file on MinIO Bucket ${incomingAudioBucket}: ${audio.id}, ${file.path}`
    );
    await minioClient.fPutObject(incomingAudioBucket, audio.id, file.path);

    logger.info("Adding audio to convert-audio queue");
    audioQueue.add("convert-audio", { audioId: audio.id });
  };
};

export default processTrackAudio;
