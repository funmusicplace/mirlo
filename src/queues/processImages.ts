import { Queue, QueueEvents } from "bullmq";
import sharp from "sharp";
import crypto from "node:crypto";

import sharpConfig from "../config/sharp";

import { REDIS_CONFIG } from "../config/redis";
import {
  createBucketIfNotExists,
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
  finalMerchImageBucket,
  finalPostImageBucket,
  finalUserAvatarBucket,
  finalUserBannerBucket,
  incomingArtistAvatarBucket,
  incomingArtistBackgroundBucket,
  incomingMerchImageBucket,
  incomingUserBannerBucket,
  uploadWrapper,
} from "../utils/minio";
import prisma from "@mirlo/prisma";
import { APIContext } from "../utils/file";
import { logger } from "../jobs/queue-worker";
import { Readable } from "stream";

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

const streamToBuffer = async (stream: Readable) => {
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

export const uploadAndSendToImageQueue = async (
  ctx: APIContext,
  incomingBucket: string,
  model: string,
  sharpConfigKey: "artwork" | "avatar" | "background" | "banner" | "inFormData",
  createDatabaseEntry: (
    {
      filename,
      mimeType,
    }: {
      filename: string;
      mimeType: string;
    },
    details: { dimensions: "square" | "background" | "banner" }
  ) => Promise<{ id: string } | void>,
  finalBucket?: string, // If this is not supplied, we this basically just uploads to the first bucket,0
  storeWithExtension?: boolean
) => {
  logger.info(`Uploading ${sharpConfigKey} to object storage`);

  await createBucketIfNotExists(incomingBucket, logger);
  logger.info("Made bucket");

  ctx.req.pipe(ctx.req.busboy);
  const fromBody: {
    dimensions?: "square" | "background" | "banner";
    relation?: "subscriptionTierImage";
    imageId?: string;
  } = {};

  const details = await new Promise((resolve, reject) => {
    ctx.req.busboy.on("field", function (fieldname, val) {
      if (
        fieldname === "dimensions" &&
        ["square", "background", "banner"].includes(val)
      ) {
        fromBody["dimensions"] = val as "square" | "background" | "banner";
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

        const config:
          | "square"
          | "background"
          | "banner"
          | "avatar"
          | "artwork" =
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

export const processArtistBackground = (ctx: APIContext) => {
  return async (artistId: number) => {
    return uploadAndSendToImageQueue(
      ctx,
      incomingArtistBackgroundBucket,
      "artistBackground",
      "background",
      async (fileInfo: { filename: string }) => {
        return prisma.artistBackground.upsert({
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
      finalArtistBackgroundBucket
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
    logger.info("Uploading post image to object storage");
    await createBucketIfNotExists(finalPostImageBucket, logger);

    const postWebpOptions: sharp.WebpOptions = {
      ...(sharpConfig.defaultOptions.webp.outputOptions as sharp.WebpOptions),
      ...((sharpConfig.config.artwork.webp.options ?? {}) as sharp.WebpOptions),
    };

    if (postWebpOptions.quality === undefined) {
      postWebpOptions.quality = 78;
    }

    if (postWebpOptions.effort === undefined) {
      postWebpOptions.effort = 4;
    }

    ctx.req.pipe(ctx.req.busboy);

    const details = await new Promise((resolve, reject) => {
      ctx.req.busboy.on("file", async (_fieldname, fileStream, fileInfo) => {
        try {
          const sourceBuffer = await streamToBuffer(fileStream as Readable);
          const sourceExtension =
            fileInfo.filename.split(".").pop()?.toLowerCase() ?? "jpg";
          const imageId = crypto.randomUUID();

          let outputBuffer = sourceBuffer;
          let extension = "webp";
          let mimeType = "image/webp";

          try {
            outputBuffer = await sharp(sourceBuffer)
              .rotate()
              .resize({
                width: 1920,
                height: 1920,
                fit: "inside",
                withoutEnlargement: true,
              })
              .webp(postWebpOptions)
              .toBuffer();
          } catch (error) {
            logger.warn(
              `Post image optimization failed for ${fileInfo.filename}. Falling back to original upload format.`,
              error
            );
            extension = sourceExtension;
            mimeType = fileInfo.mimeType;
          }

          await prisma.postImage.create({
            data: {
              id: imageId,
              postId,
              mimeType,
              extension,
            },
          });

          await uploadWrapper(
            finalPostImageBucket,
            `${imageId}.${extension}`,
            outputBuffer,
            {
              contentType: mimeType,
            }
          );

          resolve({ imageId });
        } catch (e) {
          logger.error("There was an error optimizing the post image");
          reject(e);
        }
      });
    }).catch((e) => {
      logger.error("There was an error uploading the post image");
      throw e;
    });

    return details as { imageId: string };
  };
};
