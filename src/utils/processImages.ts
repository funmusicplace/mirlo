import { Request, Response } from "express";

import { Queue, QueueEvents } from "bullmq";
import winston from "winston";
import dimensions from "image-size";
import { fromFile } from "file-type";
import * as Minio from "minio";

import sharpConfig from "../config/sharp";

import { SUPPORTED_IMAGE_MIME_TYPES } from "../config/supported-media-types";
import { REDIS_CONFIG } from "../config/redis";
import {
  createBucketIfNotExists,
  finalArtistBannerBucket,
  finalCoversBucket,
  incomingArtistBannerBucket,
  incomingCoversBucket,
} from "./minio";
import prisma from "../../prisma/prisma";

type ConfigTypes = "artwork" | "avatar" | "banner";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  MINIO_PORT = 9000,
} = process.env;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "process-file" },
  transports: [
    new winston.transports.Console({
      level: "debug",
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      filename: "error.log",
      level: "error",
    }),
  ],
});

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

const queueOptions = {
  prefix: "blackbird",
  connection: REDIS_CONFIG,
};

export const imageQueue = new Queue("optimize-image", queueOptions);

const imageQueueEvents = new QueueEvents("optimize-image", queueOptions);

imageQueueEvents.on("stalled", () => {
  console.log("stalled");
});

imageQueueEvents.on("added", () => {
  console.log("started a job");
});

imageQueueEvents.on("error", () => {
  console.log("errored");
});

imageQueueEvents.on("completed", async (jobId: any) => {
  logger.info(`Job with id ${jobId} has been completed`);

  try {
    const job = await imageQueue.getJob(jobId);
    if (job) {
      // FIXME: post image processing updates
      // await File.update(
      //   {
      //     status: "ok",
      //   },
      //   {
      //     where: {
      //       id: job.data.filename, // uuid
      //     },
      //   }
      // );
    }
  } catch (err) {
    logger.error(err);
  }
});

type APIContext = {
  req: Request;
  res: Response;
};

type APIFile = {
  originalname: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
};

const checkFileType = async (ctx: APIContext, file: APIFile) => {
  const { path: filepath } = file;
  const type = await fromFile(filepath);
  const mime = type !== null && type !== undefined ? type.mime : file.mimetype;
  const isImage = SUPPORTED_IMAGE_MIME_TYPES.includes(mime);

  if (!isImage) {
    logger.error("Not an image");
    ctx.res.status(400);
    throw `File type not supported: ${mime}`;
  }

  return { filepath };
};

export const processArtistBanner = (ctx: APIContext) => {
  return async (file: APIFile, artistId: number) => {
    await checkFileType(ctx, file);
    console.log("processing artist banner");
    const image = await prisma.artistBanner.upsert({
      create: {
        originalFilename: file.originalname,
        artistId: artistId,
      },
      update: {
        originalFilename: file.originalname,
      },
      where: {
        artistId,
      },
    });

    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_PORT}`);
    logger.info("Uploading image to object storage");

    await createBucketIfNotExists(
      minioClient,
      incomingArtistBannerBucket,
      logger
    );

    logger.info(
      `Going to put a file on MinIO Bucket ${incomingArtistBannerBucket}: ${image.id}, ${file.path}`
    );

    minioClient
      .fPutObject(incomingArtistBannerBucket, image.id, file.path)
      .then((objInfo: { etag: string }) => {
        logger.info("File put on minIO", objInfo);
        logger.info("Adding image to queue");

        imageQueue.add("optimize-image", {
          filepath: file.path,
          destination: image.id,
          model: "artistBanner",
          incomingMinioBucket: incomingArtistBannerBucket,
          finalMinioBucket: finalArtistBannerBucket,
          config: sharpConfig.config["banner"],
        });
      });
  };
};

export const processTrackGroupCover = (ctx: APIContext) => {
  return async (file: APIFile, trackGroupId: number) => {
    await checkFileType(ctx, file);

    const image = await prisma.trackGroupCover.upsert({
      create: {
        originalFilename: file.originalname,
        trackGroupId: Number(trackGroupId),
      },
      update: {
        originalFilename: file.originalname,
      },
      where: {
        trackGroupId: Number(trackGroupId),
      },
    });

    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_PORT}`);
    logger.info("Uploading image to object storage");

    await createBucketIfNotExists(minioClient, incomingCoversBucket, logger);

    logger.info(
      `Going to put a file on MinIO Bucket ${incomingCoversBucket}: ${image.id}, ${file.path}`
    );
    minioClient
      .fPutObject(incomingCoversBucket, image.id, file.path)
      .then((objInfo: { etag: string }) => {
        logger.info("File put on minIO", objInfo);
        logger.info("Adding image to queue");

        imageQueue.add("optimize-image", {
          filepath: file.path,
          destination: image.id,
          model: "trackGroupCover",
          incomingMinioBucket: incomingCoversBucket,
          finalMinioBucket: finalCoversBucket,
          config: sharpConfig.config["artwork"],
        });
      });

    return image;
  };
};

export default processTrackGroupCover;
