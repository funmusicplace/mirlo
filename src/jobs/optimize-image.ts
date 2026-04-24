import prisma from "@mirlo/prisma";
import { Job } from "bullmq";
import { uniq } from "lodash";
import fetch from "node-fetch";
import sharp from "sharp";
import ico from "sharp-ico";

import tempSharpConfig from "../config/sharp";
import { generateFullStaticImageUrl } from "../utils/images";
import {
  createBucketIfNotExists,
  getBufferFromStorage,
  removeObjectFromStorage,
  uploadWrapper,
} from "../utils/minio";

import { logger } from "./queue-worker";
import sendMail from "./send-mail";

const { defaultOptions, config: sharpConfig } = tempSharpConfig;

const { SIGHTENGINE_USER, SIGHTENGINE_SECRET } = process.env;

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });

/**
 * Convert and optimize track artworks to mozjpeg and webp
 */

const optimizeImage = async (job: Job) => {
  const {
    config = sharpConfig.artwork,
    destinationId,
    model,
    incomingMinioBucket,
    finalMinioBucket,
  } = job.data;

  try {
    const profiler = logger.startTimer();

    logger.info(`Starting to optimize images ${model}/${destinationId}`);
    const { buffer } = await getBufferFromStorage(
      incomingMinioBucket,
      destinationId
    );

    if (!buffer) {
      logger.error(
        `No buffer found for ${incomingMinioBucket}/${destinationId}`
      );
      return { error: "No buffer found" };
    }

    await createBucketIfNotExists(finalMinioBucket, logger);

    // logger.info(`Got object of size ${size}`);
    const promises = Object.entries(config)
      .map(([key, value], i) => {
        const outputType = key as "webp"; // output type (jpeg, webp)
        const {
          // @ts-ignore
          options = {},
          variants = [],
          // @ts-ignore
          ext = defaultOptions[outputType].ext,
        } = value as {
          options: {
            [key: string]: unknown;
          };
          variants: { width: number; height: number }[];
        };

        const outputOptions = Object.assign(
          {},
          defaultOptions[outputType].outputOptions,
          options
        );

        const largestVariant = variants.reduce(
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

        const originalResizeOptions =
          largestVariant.width || largestVariant.height
            ? {
                width: largestVariant.width,
                height: largestVariant.height,
                fit: "inside" as const,
                withoutEnlargement: true,
              }
            : undefined;

        const ar = [1];

        return [
          ...ar.map(async () => {
            logger.info(`Optimizing image to ${outputType}`);
            try {
              const originalPipeline = sharp(buffer).rotate();

              if (originalResizeOptions) {
                originalPipeline.resize(originalResizeOptions);
              }

              const originalSize =
                await originalPipeline[outputType](outputOptions).toBuffer();

              await uploadWrapper(
                finalMinioBucket,
                `${destinationId}-original${ext}`,
                originalSize,
                {
                  contentType: `image/${outputType}`,
                  cacheControl: "public, max-age=31536000, immutable",
                }
              );

              return {
                width: "original",
                height: "original",
                format: outputType,
              };
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : String(e);
              logger.error(
                `Error processing original image for ${outputType}: ${errorMessage}`
              );
              return null;
            }
          }),
          ...variants.map(
            async (
              variant: {
                extract?: any;
                resize?: any;
                outputOptions?: any;
                blur?: any;
                width?: number;
                height?: number;
                suffix?: any;
              },
              j
            ) => {
              // This is a pretty hacky way of sleeping and probably something we shoudl
              // not do?
              // But basically the reason we have to do this is because backblaze
              // seems to not like it when we bombard it with files all in one go,
              // so when we do Promise.all at the end of this we're sending all the
              // files and it just doesn't process anything but the first one.
              await sleep((i + 1) * (j + 1) * 1500);
              const { width, height, suffix = `-x${width}` } = variant;

              const finalFileName = `${destinationId}${suffix}${ext}`;

              logger.info(`Destination: ${finalFileName}`);

              const resizeOptions = Object.assign(
                {
                  width,
                  height,
                  withoutEnlargement: true,
                },
                variant.resize || {}
              );

              let newBuffer;

              const variantOptions = {
                ...outputOptions,
                ...(variant.outputOptions ?? {}),
              };

              try {
                newBuffer = await sharp(buffer)
                  .rotate()
                  .resize(resizeOptions)
                  [outputType](variantOptions)
                  .toBuffer();
                logger.info(
                  `created size ${resizeOptions.width}x${resizeOptions.height} for ${outputType}`
                );

                logger.info("Uploading image to bucket");
                await uploadWrapper(
                  finalMinioBucket,
                  finalFileName,
                  newBuffer,
                  {
                    contentType: `image/${outputType}`,
                    cacheControl: "public, max-age=31536000, immutable",
                  }
                );

                logger.info(`Converted and optimized image to ${outputType}`, {
                  ratio: `${width}x${height})`,
                });
                return {
                  width: width,
                  height: height,
                  format: outputType,
                };
              } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                logger.error(
                  `Error processing variant ${suffix} for ${outputType}: ${errorMessage}`
                );
                return null;
              }
            }
          ),
        ];
      })
      .flat(1);

    const results = await Promise.allSettled(promises);
    const successfulResults = results
      .map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          logger.error(`Promise rejected: ${result.reason}`);
          return null;
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r !== undefined);

    const urls = uniq(
      successfulResults.map((r) =>
        r?.width !== "original"
          ? `${destinationId}-x${r?.width}`
          : `${destinationId}-original`
      )
    ) as string[];
    logger.info(`Saving URLs [${urls.join(", ")}]`);

    if (model === "image") {
      await prisma.image.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    }

    if (model === "trackGroupCover") {
      await prisma.trackGroupCover.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    } else if (model === "artistBackground") {
      await prisma.artistBackground.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    } else if (model === "userAvatar") {
      try {
        const faviconFinalName = `${destinationId}_user_avatar_favicon.ico`;
        const sharpBuffer = await sharp(buffer).png().toBuffer();
        const faviconBuffer = ico.encode([sharpBuffer]);
        logger.info("Uploading user avatar favicon to bucket");
        await uploadWrapper(finalMinioBucket, faviconFinalName, faviconBuffer, {
          contentType: "image/x-icon",
          cacheControl: "public, max-age=604800, stale-while-revalidate=604800",
        });
        logger.info("User avatar favicon uploaded successfully");
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.error(`Error creating user avatar favicon: ${errorMessage}`);
      }

      await prisma.userAvatar.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    } else if (model === "userBanner") {
      await prisma.userBanner.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    } else if (model === "artistAvatar") {
      try {
        const faviconFinalName = `${destinationId}_artist_avatar_favicon.ico`;
        const sharpBuffer = await sharp(buffer).png().toBuffer();
        const faviconBuffer = ico.encode([sharpBuffer]);
        logger.info("Uploading artist avatar favicon to bucket");
        await uploadWrapper(finalMinioBucket, faviconFinalName, faviconBuffer, {
          contentType: "image/x-icon",
          cacheControl: "public, max-age=604800, stale-while-revalidate=604800",
        });
        logger.info("Artist avatar favicon uploaded successfully");
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.error(`Error creating artist avatar favicon: ${errorMessage}`);
      }

      await prisma.artistAvatar.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    } else if (model === "merchImage") {
      await prisma.merchImage.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    }

    profiler.done({ message: "Done optimizing image" });
    logger.info(`Removing from Bucket ${incomingMinioBucket}`);

    await removeObjectFromStorage(incomingMinioBucket, destinationId);

    if (urls.length === 0) {
      logger.warn(
        `No successful image URLs generated for ${destinationId}. Skipping SightEngine check.`
      );
      return { error: "No images were successfully optimized" };
    }

    if (SIGHTENGINE_USER && SIGHTENGINE_SECRET) {
      logger.info("Checking SightEngine");
      const searchParams = new URLSearchParams();
      searchParams.append(
        "url",
        generateFullStaticImageUrl(urls[0], finalMinioBucket)
      );
      searchParams.append("models", "nudity-2.1");
      searchParams.append("api_user", SIGHTENGINE_USER);
      searchParams.append("api_secret", SIGHTENGINE_SECRET);

      const response = await fetch(
        `https://api.sightengine.com/1.0/check.json?${searchParams.toString()}`,
        {
          method: "GET",
        }
      );
      if (response.status === 200) {
        const result = await response.json();
        if (result.nudity.sexual_display > 0.9) {
          logger.info("Sending an email report about SightEngine");
          await sendMail({
            data: {
              template: "sight-engine-report",
              message: {
                to: "hi@mirlo.space",
              },
              locals: {
                model,
                destinationId,
                sightEngineId: result.request.id,
              },
            },
          } as Job);
        }
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : "";
    logger.error(`optimizeImage error: ${errorMessage}`, { stack: errorStack });
    return { error: errorMessage };
  }
};

export default optimizeImage;
