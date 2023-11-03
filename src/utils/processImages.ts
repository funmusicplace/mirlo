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
import { APIContext, APIFile, checkFileType } from "./file";
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

    minioClient
      .fPutObject(incomingArtistBannerBucket, image.id, file.path)
      .then((objInfo: { etag: string }) => {
        logger.info("File put on minIO", objInfo);
        logger.info("Adding image to queue");

        imageQueue.add("optimize-image", {
          filepath: file.path,
          destination: image.id,
          model: "artistAvatar",
          incomingMinioBucket: incomingArtistAvatarBucket,
          finalMinioBucket: finalArtistAvatarBucket,
          config: sharpConfig.config["banner"],
        });
      });
  };
};

export const processArtistBanner = (ctx: APIContext) => {
  return async (file: APIFile, artistId: number) => {
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
    await checkFileType(ctx, file, SUPPORTED_IMAGE_MIME_TYPES);

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

    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_API_PORT}`);
    logger.info("Uploading image to object storage");

    await createBucketIfNotExists(minioClient, incomingCoversBucket, logger);

    logger.info(
      `Going to put a file on MinIO Bucket ${incomingCoversBucket}: ${image.id}, ${file.path}`
    );
    const objInfo = await minioClient.fPutObject(
      incomingCoversBucket,
      image.id,
      file.path
    );
    logger.info("File put on minIO", objInfo);
    logger.info("Adding image to queue");

    const job = await imageQueue.add("optimize-image", {
      filepath: file.path,
      destination: image.id,
      model: "trackGroupCover",
      incomingMinioBucket: incomingCoversBucket,
      finalMinioBucket: finalCoversBucket,
      config: sharpConfig.config["artwork"],
    });

    return job.id;
  };
};

export default processTrackGroupCover;
