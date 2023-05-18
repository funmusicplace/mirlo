import { Request, Response } from "express";
import { Queue, QueueEvents } from "bullmq";
import { promises as fs } from "fs";
import path from "path";
import shasum from "shasum";
import winston from "winston";
import { fromFile } from "file-type";
import mm from "music-metadata";

import {
  // FIXME: HIGH_RES_AUDIO_MIME_TYPES,
  SUPPORTED_AUDIO_MIME_TYPES,
} from "../config/supported-media-types";
import { REDIS_CONFIG } from "../config/redis";
import sendMail from "../jobs/send-mail";
import * as Minio from "minio";

import prisma from "../../prisma/prisma";
import { logger } from "../logger";
import { checkFileType } from "./file";
import { createBucketIfNotExists, incomingAudioBucket } from "./minio";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  MINIO_PORT = 9000,
} = process.env;

// FIXME: can this be re-imported like prisma or the logger?
// Instantiate the minio client with the endpoint
// and access keys as shown below.
const minioClient = new Minio.Client({
  endPoint: MINIO_HOST,
  port: +MINIO_PORT,
  useSSL: false,
  // useSSL: NODE_ENV !== "development",
  accessKey: MINIO_ROOT_USER,
  secretKey: MINIO_ROOT_PASSWORD,
});

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || "/";

const buildTrackStreamURL = (trackId: number) => {
  return `/v1/tracks/${trackId}/stream/playlist.m3u8`;
};

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const audioQueue = new Queue("convert-audio", queueOptions);

const audioQueueEvents = new QueueEvents("convert-audio", queueOptions);

audioQueueEvents.on("completed", async (jobId: any) => {
  logger.info(`Job with id ${jobId} has been completed`);

  try {
    const job = await audioQueue.getJob(jobId);

    if (job) {
      const file = await prisma.trackAudio.findFirst({
        where: {
          id: job.data.filename,
        },
      });
      if (file) {
        logger.info("found audio file");
        // FIXME: Add metadata to a track
        // const metadata = file.metadata || { variants: [] };
        // const variants = metadata.variants || [];

        // for (const result of job.returnvalue) {
        //   variants.push({
        //     format: "m4a",
        //     size: result.size,
        //     name: "audiofile",
        //   });
        // }

        // metadata.variants = variants;

        // await File.update(
        //   {
        //     // metadata: metadata,
        //     status: "ok",
        //   },
        //   {
        //     where: {
        //       id: job.data.filename, // uuid
        //     },
        //   }
        // );
      }
    }
  } catch (err) {
    logger.error(err);
  }
});

const audioDurationQueue = new Queue("audio-duration", queueOptions);

const audioDurationQueueEvents = new QueueEvents(
  "audio-duration",
  queueOptions
);

audioDurationQueueEvents.on("completed", async (jobId: any) => {
  try {
    const job = await audioDurationQueue.getJob(jobId);

    if (job) {
      // FIXME: add duration to a track
      // const file = await File.findOne({
      //   where: {
      //     id: job.data.filename,
      //   },
      // });
      // const track = await Track.findOne({
      //   where: {
      //     url: file.id,
      //   },
      // });
      // track.duration = job.returnvalue;
      // await track.save();
    }
  } catch (err) {
    logger.error(err);
  }
});

/*
 * Process an audio then queue it for upload
 */
export const processTrackAudio = (ctx: { req: Request; res: Response }) => {
  return async (file: any, trackId: number) => {
    await checkFileType(ctx, file, SUPPORTED_AUDIO_MIME_TYPES);

    const buffer = await fs.readFile(file.path);
    const sha1sum = shasum(buffer);

    const audio = await prisma.trackAudio.upsert({
      create: {
        trackId,
        url: buildTrackStreamURL(trackId),
        originalFilename: file.originalFilename,
        size: file.size,
        hash: sha1sum,
      },
      update: {
        trackId,
        originalFilename: file.originalFilename,
        url: buildTrackStreamURL(trackId),
        size: file.size,
        hash: sha1sum,
      },
      where: {
        trackId: Number(trackId),
      },
    });

    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_PORT}`);
    logger.info("Uploading image to object storage");

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
