import { Request, Response } from "express";
import { PrismaClient, TrackGroupCover } from "@prisma/client";

import { Queue, QueueEvents } from "bullmq";
import winston from "winston";
import dimensions from "image-size";
import { fromFile } from "file-type";
import * as Minio from "minio";

import sharpConfig from "../config/sharp";

import { SUPPORTED_IMAGE_MIME_TYPES } from "../config/supported-media-types";
import { REDIS_CONFIG } from "../config/redis";
import sendMail from "../jobs/send-mail";
import { createBucketIfNotExists, incomingCoversBucket } from "./minio";

const prisma = new PrismaClient();

type ConfigTypes = "artwork" | "avatar" | "banner";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  MINIO_PORT = 9000,
  NODE_ENV,
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
  useSSL: NODE_ENV !== "development",
  accessKey: MINIO_ROOT_USER,
  secretKey: MINIO_ROOT_PASSWORD,
});

const queueOptions = {
  prefix: "nomads",
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

export const processTrackGroupCover = (ctx: {
  req: Request;
  res: Response;
}) => {
  return async (
    file: {
      originalname: string;
      filename: string;
      path: string;
      mimetype: string;
      size: number;
    },
    trackGroupId: number
  ) => {
    const { size: fileSize, path: filepath, filename } = file;
    const type = await fromFile(filepath);
    const mime =
      type !== null && type !== undefined ? type.mime : file.mimetype;
    const isImage = SUPPORTED_IMAGE_MIME_TYPES.includes(mime);

    if (!isImage) {
      logger.error("Not an image");
      ctx.res.status(400);
      throw `File type not supported: ${mime}`;
    }

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

    const { config = "artwork" }: { config: ConfigTypes } = ctx.req.body; // sharp config key
    const { width, height } = await dimensions(filepath);

    // const image = await prisma.image.findFirst({
    //   where: {
    //     id: filename,
    //   },
    // });

    // const metadata = file.metadata || {};

    // file.metadata = Object.assign(metadata, {
    //   dimensions: { width, height },
    // });

    logger.info("Uploading image to object storage");

    await createBucketIfNotExists(minioClient, incomingCoversBucket, logger);

    logger.info(
      `Going to put a file on MinIO Bucket ${incomingCoversBucket}: ${image.id}, ${filepath}`
    );
    minioClient
      .fPutObject(incomingCoversBucket, image.id, filepath)
      .then((objInfo: { etag: string }) => {
        logger.info("File put on minIO", objInfo);
        logger.info("Adding image to queue");

        imageQueue.add("optimize-image", {
          filepath,
          destination: image.id,
          config: sharpConfig.config[config],
        });
      });

    return image;
  };
};

export default processTrackGroupCover;
