import { Queue, QueueEvents } from "bullmq";

import sharpConfig from "../config/sharp";

import { REDIS_CONFIG } from "../config/redis";
import {
  createBucketIfNotExists,
  finalArtistAvatarBucket,
  finalArtistBannerBucket,
  finalMerchImageBucket,
  incomingArtistAvatarBucket,
  incomingArtistBannerBucket,
  incomingMerchImageBucket,
  minioClient,
} from "../utils/minio";
import prisma from "@mirlo/prisma";
import { APIContext } from "../utils/file";
import { logger } from "../jobs/queue-worker";

const { MINIO_HOST = "", MINIO_API_PORT = 9000 } = process.env;

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const imageQueue = new Queue("optimize-image", queueOptions);

const imageQueueEvents = new QueueEvents("optimize-image", queueOptions);

imageQueueEvents.on("stalled", () => {
  logger.info("stalled");
});

imageQueueEvents.on("added", () => {
  logger.info("started a job");
});

imageQueueEvents.on("error", () => {
  logger.info("errored");
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
    logger.error(`imageQueueEvents.completed ${JSON.stringify(err)}`);
  }
});

export default imageQueue;

export const sendToImageQueue = async (
  ctx: APIContext,
  incomingBucket: string,
  model: string,
  finalBucket: string,
  sharpConfigKey: "artwork" | "avatar" | "banner",
  createDatabaseEntry: ({
    filename,
  }: {
    filename: string;
  }) => Promise<{ id: string }>
) => {
  logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_API_PORT}`);
  logger.info("Uploading image to object storage");

  await createBucketIfNotExists(minioClient, incomingBucket, logger);
  logger.info("Made bucket");

  ctx.req.pipe(ctx.req.busboy);

  const jobId = await new Promise((resolve, reject) => {
    ctx.req.busboy.on("file", async (_fieldname, fileStream, fileInfo) => {
      const image = await createDatabaseEntry(fileInfo);

      logger.info(
        `Going to put a file on MinIO Bucket ${incomingBucket}: ${image.id}, ${fileInfo.filename}`
      );
      try {
        await minioClient.putObject(incomingBucket, image.id, fileStream);
      } catch (e) {
        logger.error("There was an error uploading to minio");
        throw e;
      }

      logger.info("Adding image to queue");

      const job = await imageQueue.add("optimize-image", {
        destinationId: image.id,
        model,
        incomingMinioBucket: incomingBucket,
        finalMinioBucket: finalBucket,
        config: sharpConfig.config[sharpConfigKey],
      });
      resolve(job.id);
    });
  }).catch((e) => {
    logger.error("There was an error optimizing the image");
    throw e;
  });

  return jobId;
};

export const processArtistAvatar = (ctx: APIContext) => {
  return async (artistId: number) => {
    return sendToImageQueue(
      ctx,
      incomingArtistAvatarBucket,
      "artistAvatar",
      finalArtistAvatarBucket,
      "avatar",
      async (fileInfo: { filename: string }) => {
        return prisma.artistAvatar.upsert({
          create: {
            originalFilename: fileInfo.filename,
            artistId: artistId,
          },
          update: {
            originalFilename: fileInfo.filename,
            deletedAt: null,
          },
          where: {
            artistId,
          },
        });
      }
    );
  };
};

export const processArtistBanner = (ctx: APIContext) => {
  return async (artistId: number) => {
    return sendToImageQueue(
      ctx,
      incomingArtistBannerBucket,
      "artistBanner",
      finalArtistBannerBucket,
      "banner",
      async (fileInfo: { filename: string }) => {
        return prisma.artistBanner.upsert({
          create: {
            originalFilename: fileInfo.filename,
            artistId: artistId,
          },
          update: {
            originalFilename: fileInfo.filename,
            deletedAt: null,
          },
          where: {
            artistId,
          },
        });
      }
    );
  };
};

export const processMerchImage = (ctx: APIContext) => {
  return async (merchId: string) => {
    return sendToImageQueue(
      ctx,
      incomingMerchImageBucket,
      "merchImage",
      finalMerchImageBucket,
      "artwork",
      async (_fileInfo: { filename: string }) => {
        const exists = await prisma.merchImage.findFirst({
          where: {
            merchId,
          },
        });
        if (exists) {
          return exists;
        }
        return prisma.merchImage.create({
          data: {
            merchId,
          },
        });
      }
    );
  };
};
