import { Queue, QueueEvents } from "bullmq";
import * as Minio from "minio";

import sharpConfig from "../config/sharp";

import { SUPPORTED_IMAGE_MIME_TYPES } from "../config/supported-media-types";
import { REDIS_CONFIG } from "../config/redis";
import {
  createBucketIfNotExists,
  finalArtistAvatarBucket,
  finalArtistBannerBucket,
  finalCoversBucket,
  incomingArtistAvatarBucket,
  incomingArtistBannerBucket,
  incomingCoversBucket,
  minioClient,
} from "./minio";
import prisma from "../../prisma/prisma";
import {
  APIContext,
  APIFile,
  checkFileType,
  checkFileTypeFromStream,
} from "./file";
import { logger } from "../jobs/queue-worker";

const { MINIO_HOST = "", MINIO_API_PORT = 9000 } = process.env;

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const imageQueue = new Queue("optimize-image", queueOptions);

const imageQueueEvents = new QueueEvents("optimize-image", queueOptions);

imageQueueEvents.on("stalled", () => {
  console.log("stalled");
});

imageQueueEvents.on("added", () => {
  logger.info("started a job");
});

imageQueueEvents.on("error", () => {
  console.log("errored");
});

imageQueueEvents.on("completed", async (result: { jobId: string }) => {
  logger.info(`Job with id ${result.jobId} has been completed`);

  try {
    const job = await imageQueue.getJob(result.jobId);
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

export default imageQueue;

export const processArtistAvatar = (ctx: APIContext) => {
  return async (file: APIFile, artistId: number) => {
    await checkFileType(ctx, file, SUPPORTED_IMAGE_MIME_TYPES, logger);

    const image = await prisma.artistAvatar.upsert({
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

    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_API_PORT}`);
    logger.info("Uploading image to object storage");

    await createBucketIfNotExists(
      minioClient,
      incomingArtistAvatarBucket,
      logger
    );

    logger.info(
      `Going to put a file on MinIO Bucket ${incomingArtistAvatarBucket}: ${image.id}, ${file.path}`
    );

    const objInfo = await minioClient.fPutObject(
      incomingArtistBannerBucket,
      image.id,
      file.path
    );
    logger.info("File put on minIO", objInfo);
    logger.info("Adding image to queue");

    const job = await imageQueue.add("optimize-image", {
      filepath: file.path,
      destination: image.id,
      model: "artistAvatar",
      incomingMinioBucket: incomingArtistAvatarBucket,
      finalMinioBucket: finalArtistAvatarBucket,
      config: sharpConfig.config["avatar"],
    });

    return job.id;
  };
};

export const processArtistBanner = (ctx: APIContext) => {
  return async (file: APIFile, artistId: number) => {
    console.log("processing artist banner", file);
    await checkFileType(ctx, file, SUPPORTED_IMAGE_MIME_TYPES, logger);

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

    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_API_PORT}`);
    logger.info("Uploading image to object storage");

    await createBucketIfNotExists(
      minioClient,
      incomingArtistBannerBucket,
      logger
    );

    logger.info(
      `Going to put a file on MinIO Bucket ${incomingArtistBannerBucket}: ${image.id}, ${file.path}`
    );

    const objInfo = await minioClient.fPutObject(
      incomingArtistBannerBucket,
      image.id,
      file.path
    );

    logger.info("File put on minIO", objInfo);
    logger.info("Adding image to queue");

    const job = await imageQueue.add("optimize-image", {
      filepath: file.path,
      destination: image.id,
      model: "artistBanner",
      incomingMinioBucket: incomingArtistBannerBucket,
      finalMinioBucket: finalArtistBannerBucket,
      config: sharpConfig.config["banner"],
    });
    return job.id;
  };
};
