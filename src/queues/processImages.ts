import { Queue, QueueEvents } from "bullmq";

import sharpConfig from "../config/sharp";

import { REDIS_CONFIG } from "../config/redis";
import {
  createBucketIfNotExists,
  finalArtistAvatarBucket,
  finalArtistBannerBucket,
  finalMerchImageBucket,
  finalPostImageBucket,
  finalUserAvatarBucket,
  finalUserBannerBucket,
  incomingArtistAvatarBucket,
  incomingArtistBannerBucket,
  incomingMerchImageBucket,
  incomingUserBannerBucket,
  uploadWrapper,
} from "../utils/minio";
import prisma from "@mirlo/prisma";
import { APIContext } from "../utils/file";
import { logger } from "../jobs/queue-worker";

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

export const uploadAndSendToImageQueue = async (
  ctx: APIContext,
  incomingBucket: string,
  model: string,
  sharpConfigKey: "artwork" | "avatar" | "banner" | "inFormData",
  createDatabaseEntry: (
    {
      filename,
      mimeType,
    }: {
      filename: string;
      mimeType: string;
    },
    details: { dimensions: "square" | "banner" }
  ) => Promise<{ id: string } | void>,
  finalBucket?: string, // If this is not supplied, we this basically just uploads to the first bucket,0
  storeWithExtension?: boolean
) => {
  logger.info(`Uploading ${sharpConfigKey} to object storage`);

  await createBucketIfNotExists(incomingBucket, logger);
  logger.info("Made bucket");

  ctx.req.pipe(ctx.req.busboy);
  const fromBody: {
    dimensions?: "square" | "banner";
    relation?: "subscriptionTierImage";
    imageId?: string;
  } = {};

  const details = await new Promise((resolve, reject) => {
    ctx.req.busboy.on("field", function (fieldname, val) {
      if (fieldname === "dimensions" && ["square", "banner"].includes(val)) {
        fromBody["dimensions"] = val as "square" | "banner";
      }
      if (fieldname === "imageId") {
        fromBody["imageId"] = val;
      }
    });
    ctx.req.busboy.on("file", async (_fieldname, fileStream, fileInfo) => {
      if (sharpConfigKey === "inFormData" && !fromBody.dimensions) {
        reject("Must provide dimensions field in form data");
        return;
      }
      const image = await createDatabaseEntry(fileInfo, {
        ...(fromBody as {
          dimensions: "square";
          relation?: "subscriptionTierImage";
        }),
      });

      if (!image) {
        reject("Could not create database entry");
        return;
      }

      try {
        const filenameArray = fileInfo.filename.split(".");
        const fileName = storeWithExtension
          ? `${image.id}.${[filenameArray[filenameArray.length - 1]]}`
          : image.id;
        await uploadWrapper(incomingBucket, `${fileName}`, fileStream);
      } catch (e) {
        logger.error("There was an error uploading to storage");
        throw e;
      }

      if (finalBucket) {
        logger.info("Adding image to queue");

        const config: "square" | "banner" | "avatar" | "artwork" =
          sharpConfigKey === "inFormData"
            ? (fromBody.dimensions ?? "square")
            : sharpConfigKey;

        const job = await imageQueue.add("optimize-image", {
          destinationId: image.id,
          model,
          incomingMinioBucket: incomingBucket,
          finalMinioBucket: finalBucket,
          config: sharpConfig.config[config],
        });
        resolve({ jobId: job.id, imageId: image.id });
      } else {
        resolve({ imageId: image.id });
      }
    });
  }).catch((e) => {
    logger.error("There was an error optimizing the image");
    throw e;
  });

  return details as { jobId?: string; imageId: string };
};

export const processUserAvatar = (ctx: APIContext) => {
  return async (userId: number) => {
    return uploadAndSendToImageQueue(
      ctx,
      incomingArtistAvatarBucket,
      "userAvatar",
      "avatar",
      async (fileInfo: { filename: string }) => {
        logger.info(`Upserting artist avatar`);
        return prisma.userAvatar.upsert({
          create: {
            originalFilename: fileInfo.filename,
            userId,
          },
          update: {
            originalFilename: fileInfo.filename,
            deletedAt: null,
          },
          where: {
            userId,
          },
        });
      },
      finalUserAvatarBucket
    );
  };
};

export const processUserBanner = (ctx: APIContext) => {
  return async (userId: number) => {
    return uploadAndSendToImageQueue(
      ctx,
      incomingUserBannerBucket,
      "userBanner",
      "banner",
      async (fileInfo: { filename: string }) => {
        logger.info(`Upserting user banner`);
        return prisma.userBanner.upsert({
          create: {
            originalFilename: fileInfo.filename,
            userId,
          },
          update: {
            originalFilename: fileInfo.filename,
            deletedAt: null,
          },
          where: {
            userId,
          },
        });
      },
      finalUserBannerBucket
    );
  };
};

export const processArtistAvatar = (ctx: APIContext) => {
  return async (artistId: number) => {
    return uploadAndSendToImageQueue(
      ctx,
      incomingArtistAvatarBucket,
      "artistAvatar",
      "avatar",
      async (fileInfo: { filename: string }) => {
        logger.info(`Upserting artist avatar`);
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
      },
      finalArtistAvatarBucket
    );
  };
};

export const processArtistBanner = (ctx: APIContext) => {
  return async (artistId: number) => {
    return uploadAndSendToImageQueue(
      ctx,
      incomingArtistBannerBucket,
      "artistBanner",
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
      },
      finalArtistBannerBucket
    );
  };
};

export const processMerchImage = (ctx: APIContext) => {
  return async (merchId: string) => {
    return uploadAndSendToImageQueue(
      ctx,
      incomingMerchImageBucket,
      "merchImage",
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
      },
      finalMerchImageBucket
    );
  };
};

export const processPostImage = (ctx: APIContext) => {
  return async (postId: number) => {
    return uploadAndSendToImageQueue(
      ctx,
      finalPostImageBucket,
      "postImage",
      "artwork",
      async (fileInfo: { filename: string; mimeType: string }) => {
        const filenameArray = fileInfo.filename.split(".");

        return prisma.postImage.create({
          data: {
            postId,
            mimeType: fileInfo.mimeType,
            extension: filenameArray[filenameArray.length - 1],
          },
        });
      },
      undefined,
      true
    );
  };
};
