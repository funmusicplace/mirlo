import { randomUUID } from "node:crypto";

import prisma from "@mirlo/prisma";
import { ImageSlot } from "@mirlo/prisma/client";
import { Queue, QueueEvents } from "bullmq";
import sharp from "sharp";

import { REDIS_CONFIG } from "../config/redis";
import sharpConfig from "../config/sharp";
import logger from "../logger";
import { clearTrackGroupDownloads } from "../utils/downloadCache";
import { AppError, HttpCode } from "../utils/error";
import { APIContext } from "../utils/file";
import {
  ImageType,
  imageTypeUsesQueue,
  removeIncomingImageByType,
  uploadIncomingImageByType,
} from "../utils/minio";
import { clearPageCache } from "../utils/pageCache";
import { discardPendingImage, markPendingImage } from "../utils/pendingImage";
import { stripNullBytes } from "../utils/sanitize";
import { findSettingsId } from "../utils/splashScreen";
import { deleteTrackGroupCover } from "../utils/trackGroup";

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
    if (job?.data.model === "trackGroupCover") {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: { coverImageId: job.data.destinationId },
        select: { id: true },
      });
      if (trackGroup) {
        await clearTrackGroupDownloads(trackGroup.id);
      }
    }
    if (job?.data.model === "splashImage") {
      clearPageCache();
    }
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

const getLargestVariant = (
  variants: Array<{ width?: number; height?: number }>
) => {
  return variants.reduce(
    (
      current: { width?: number; height?: number },
      variant: { width?: number; height?: number }
    ) => {
      const currentArea = (current.width ?? 0) * (current.height ?? 0);
      const variantArea = (variant.width ?? 0) * (variant.height ?? 0);
      return variantArea > currentArea ? variant : current;
    },
    {}
  );
};

const isUnsupportedImageCodecError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return (
    normalized.includes("heif") ||
    normalized.includes("heic") ||
    normalized.includes("compression format has not been built in") ||
    normalized.includes("unsupported image format")
  );
};

const fileExtension = (filename: string) => filename.split(".").pop();

const rejectMissingFile = () =>
  new AppError({
    httpCode: HttpCode.BAD_REQUEST,
    description: "No image was uploaded.",
  });

const rejectTooLarge = () =>
  new AppError({
    httpCode: HttpCode.PAYLOAD_TOO_LARGE,
    description: "The image is too large.",
  });

export const uploadAndSendToImageQueue = async (
  ctx: APIContext,
  imageType: ImageType,
  model: string,
  sharpConfigKey:
    | "artwork"
    | "avatar"
    | "background"
    | "banner"
    | "splash"
    | "inFormData",
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
  storeWithExtension?: boolean,
  pendingSlot?: { slot: ImageSlot; ownerId: number }
) => {
  logger.info(`Uploading ${sharpConfigKey} to object storage`);

  if (!ctx.req.busboy) {
    throw rejectMissingFile();
  }

  // Pipe the request body immediately so the proxy doesn't drop the connection
  // while we do async work. Bucket creation moves inside the file event handler.
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
    let hasFile = false;
    ctx.req.busboy.on("error", reject);
    ctx.req.busboy.on("close", () => {
      if (!hasFile) {
        reject(rejectMissingFile());
      }
    });
    ctx.req.busboy.on("file", async (_fieldname, fileStream, fileInfo) => {
      hasFile = true;
      const sanitizedFileInfo = {
        ...fileInfo,
        filename: stripNullBytes(fileInfo.filename) ?? "",
      };
      let isTooLarge = false;
      fileStream.on("limit", () => {
        isTooLarge = true;
      });
      try {
        if (sharpConfigKey === "inFormData" && !fromBody.dimensions) {
          reject("Must provide dimensions field in form data");
          return;
        }
        const config:
          | "square"
          | "background"
          | "banner"
          | "avatar"
          | "artwork"
          | "splash" =
          sharpConfigKey === "inFormData"
            ? (fromBody.dimensions ?? "square")
            : sharpConfigKey;

        const webpConfig = sharpConfig.config[config].webp;
        const largestVariant = getLargestVariant(webpConfig?.variants ?? []);

        const image = await createDatabaseEntry(sanitizedFileInfo, {
          ...(fromBody as {
            dimensions: "square";
            relation?: "subscriptionTierImage";
          }),
        });

        if (!image) {
          reject("Could not create database entry");
          return;
        }

        const fileName = storeWithExtension
          ? `${image.id}.${fileExtension(sanitizedFileInfo.filename)}`
          : image.id;

        try {
          const transform = sharp().rotate();

          if (largestVariant.width || largestVariant.height) {
            transform.resize({
              width: largestVariant.width,
              height: largestVariant.height,
              fit: "inside",
              withoutEnlargement: true,
            });
          }

          const optimizedStream = fileStream.pipe(transform);
          await uploadIncomingImageByType(
            imageType,
            fileName,
            optimizedStream,
            { contentType: fileInfo.mimeType || "application/octet-stream" }
          );
          if (isTooLarge) {
            throw rejectTooLarge();
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);

          logger.error("There was an error uploading to storage", {
            mimeType: fileInfo.mimeType,
            filename: fileInfo.filename,
            message,
          });

          if (isTooLarge) {
            await removeIncomingImageByType(imageType, fileName).catch(
              (removeError) =>
                logger.error(
                  `Could not remove the truncated upload ${fileName}`,
                  removeError
                )
            );
            reject(rejectTooLarge());
            return;
          }

          if (isUnsupportedImageCodecError(e)) {
            reject(
              new AppError({
                httpCode: HttpCode.NOT_ACCEPTABLE,
                description:
                  "Unsupported image format. Please upload a JPEG, PNG, GIF, or WebP image.",
              })
            );
            return;
          }

          reject(e);
          return;
        }

        if (pendingSlot) {
          await markPendingImage(
            pendingSlot.slot,
            pendingSlot.ownerId,
            image.id
          );
        }

        if (imageTypeUsesQueue(imageType)) {
          logger.info("Adding image to queue");

          const job = await imageQueue.add("optimize-image", {
            destinationId: image.id,
            model,
            imageType,
            config: sharpConfig.config[config],
            slot: pendingSlot?.slot,
          });
          resolve({ jobId: job.id, imageId: image.id });
        } else {
          resolve({ imageId: image.id });
        }
      } catch (e) {
        reject(e);
      }
    });
  }).catch((e) => {
    logger.error("There was an error optimizing the image");
    throw e;
  });

  return details as { jobId?: string; imageId: string };
};

const uploadImage = (
  ctx: APIContext,
  model: string,
  dimensions: "artwork" | "avatar" | "background",
  profileId: number
) =>
  uploadAndSendToImageQueue(
    ctx,
    "image",
    model,
    dimensions,
    async (fileInfo: { filename: string }) =>
      prisma.image.create({
        data: { originalFilename: fileInfo.filename, dimensions, profileId },
      })
  );

const uploadToImageSlot = async (
  ctx: APIContext,
  model: string,
  dimensions: "artwork" | "avatar" | "background" | "splash",
  profileId: number | undefined,
  pendingSlot: { slot: ImageSlot; ownerId: number }
) => {
  let imageId: string | undefined;
  try {
    return await uploadAndSendToImageQueue(
      ctx,
      "image",
      model,
      dimensions,
      async (fileInfo: { filename: string }) => {
        const image = await prisma.image.create({
          data: { originalFilename: fileInfo.filename, dimensions, profileId },
        });
        imageId = image.id;
        return image;
      },
      false,
      pendingSlot
    );
  } catch (e) {
    if (imageId) {
      await discardPendingImage(imageId);
    }
    throw e;
  }
};

export const processProfileImage = (
  ctx: APIContext,
  profileId: number,
  field: "avatar" | "background"
) =>
  uploadToImageSlot(
    ctx,
    field === "avatar" ? "artistAvatar" : "image",
    field,
    profileId,
    { slot: field === "avatar" ? "AVATAR" : "BACKGROUND", ownerId: profileId }
  );

export const processSplashImage = async (ctx: APIContext) =>
  uploadToImageSlot(ctx, "splashImage", "splash", undefined, {
    slot: "SPLASH",
    ownerId: await findSettingsId(),
  });

export const processTrackGroupCover = async (
  ctx: APIContext,
  trackGroup: { id: number; profileId: number }
) => {
  const result = await uploadImage(
    ctx,
    "trackGroupCover",
    "artwork",
    trackGroup.profileId
  );
  await deleteTrackGroupCover(trackGroup.id);
  await prisma.trackGroup.update({
    where: { id: trackGroup.id },
    data: { coverImageId: result.imageId },
  });
  return result;
};

export const processMerchImage = (ctx: APIContext) => {
  return async (merchId: string) => {
    return uploadAndSendToImageQueue(
      ctx,
      "image",
      "image",
      "artwork",
      async (fileInfo: { filename: string }) => {
        const merch = await prisma.merch.findUniqueOrThrow({
          where: { id: merchId },
          select: { profileId: true },
        });
        const last = await prisma.merchImage.findFirst({
          where: { merchId },
          orderBy: { position: "desc" },
        });
        return prisma.image.create({
          data: {
            originalFilename: fileInfo.filename,
            dimensions: "square",
            profileId: merch.profileId,
            merchImage: {
              create: { merchId, position: last ? last.position + 1 : 0 },
            },
          },
        });
      }
    );
  };
};

export const processPostImage = (ctx: APIContext) => {
  return async (postId: number) => {
    return uploadAndSendToImageQueue(
      ctx,
      "postImage",
      "postImage",
      "artwork",
      async (fileInfo: { filename: string }) => {
        const post = await prisma.post.findUniqueOrThrow({
          where: { id: postId },
          select: { profileId: true },
        });
        const id = randomUUID();
        return prisma.image.create({
          data: {
            id,
            url: [`${id}.${fileExtension(fileInfo.filename)}`],
            originalFilename: fileInfo.filename,
            dimensions: "artwork",
            profileId: post.profileId,
            postImage: { create: { postId } },
          },
        });
      },
      true
    );
  };
};
