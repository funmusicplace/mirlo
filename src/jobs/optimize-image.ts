import prisma from "@mirlo/prisma";
import { ImageSlot } from "@mirlo/prisma/client";
import { Job } from "bullmq";
import { sortBy, uniq } from "lodash";
import sharp from "sharp";

import tempSharpConfig from "../config/sharp";
import { moderateImageQueue } from "../queues/moderate-image-queue";
import { generateFullStaticImageUrl } from "../utils/images";
import {
  ImageType,
  downloadIncomingImageByType,
  uploadOptimizedImageByType,
  removeIncomingImageByType,
  getImagePrefix,
} from "../utils/minio";
import {
  attachPendingImage,
  discardPendingImage,
  isImagePending,
} from "../utils/pendingImage";

import { shouldModerateImage } from "./moderate-image";
import { logger } from "./queue-worker";

const { defaultOptions, config: sharpConfig } = tempSharpConfig;

const dropIncomingImage = (imageType: ImageType, destinationId: string) =>
  removeIncomingImageByType(imageType, destinationId).catch((e) =>
    logger.error(`Could not remove incoming image ${destinationId}`, e)
  );

/**
 * Convert and optimize track artworks to mozjpeg and webp
 */

const optimizeImage = async (job: Job) => {
  const {
    config = sharpConfig.artwork,
    destinationId,
    model,
    imageType,
    slot,
  } = job.data as {
    config: typeof sharpConfig.artwork;
    destinationId: string;
    model: string;
    imageType: ImageType;
    slot?: ImageSlot;
  };

  let isAttached = false;

  try {
    if (slot && !(await isImagePending(destinationId))) {
      const isInSlot = await discardPendingImage(destinationId);
      await dropIncomingImage(imageType, destinationId);
      logger.info(
        isInSlot
          ? `Image ${destinationId} is already in its slot, skipping`
          : `Image ${destinationId} is no longer awaited, dropped`
      );
      return;
    }

    const profiler = logger.startTimer();

    logger.info(`Starting to optimize images ${model}/${destinationId}`);
    const { buffer } = await downloadIncomingImageByType(
      imageType,
      destinationId
    );

    if (!buffer) {
      logger.error(`No buffer found for incoming image ${destinationId}`);
      if (slot) {
        throw new Error("No buffer found");
      }
      return { error: "No buffer found" };
    }

    const tasks = Object.entries(config).flatMap(([key, value]) => {
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

      return [
        {
          width: Infinity,
          run: async () => {
            logger.info(`Optimizing image to ${outputType}`);
            try {
              const originalPipeline = sharp(buffer).rotate();

              if (originalResizeOptions) {
                originalPipeline.resize(originalResizeOptions);
              }

              const originalSize =
                await originalPipeline[outputType](outputOptions).toBuffer();

              await uploadOptimizedImageByType(
                imageType,
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
          },
        },
        ...variants.map(
          (variant: {
            extract?: any;
            resize?: any;
            outputOptions?: any;
            blur?: any;
            width?: number;
            height?: number;
            suffix?: any;
          }) => ({
            width: variant.width ?? 0,
            run: async () => {
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
                await uploadOptimizedImageByType(
                  imageType,
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
            },
          })
        ),
      ];
    });

    // One at a time, smallest first: Backblaze drops uploads that arrive all
    // at once, and the sizes the manage pages show are the small ones.
    const results: Awaited<ReturnType<(typeof tasks)[number]["run"]>>[] = [];
    for (const { task, index } of sortBy(
      tasks.map((task, index) => ({ task, index })),
      ({ task }) => task.width
    )) {
      results[index] = await task.run();
    }
    const successfulResults = results.filter(
      (r): r is NonNullable<typeof r> => r !== null && r !== undefined
    );

    const urls = uniq(
      successfulResults.map((r) =>
        r?.width !== "original"
          ? `${destinationId}-x${r?.width}`
          : `${destinationId}-original`
      )
    ) as string[];
    logger.info(`Saving URLs [${urls.join(", ")}]`);

    await prisma.image.update({
      where: { id: destinationId },
      data: { url: urls },
    });

    if (slot && urls.length > 0) {
      isAttached = await attachPendingImage(destinationId);
      if (!isAttached) {
        await dropIncomingImage(imageType, destinationId);
        logger.info(`Image ${destinationId} lost its slot, dropped`);
        return;
      }
    }

    profiler.done({ message: "Done optimizing image" });
    logger.info(`Removing incoming image ${destinationId}`);

    await removeIncomingImageByType(imageType, destinationId);

    if (urls.length === 0) {
      logger.warn(
        `No successful image URLs generated for ${destinationId}. Skipping SightEngine check.`
      );
      if (slot) {
        throw new Error("No images were successfully optimized");
      }
      return { error: "No images were successfully optimized" };
    }

    if (shouldModerateImage(model)) {
      await moderateImageQueue.add("moderate-image", {
        model,
        imageId: destinationId,
        url: generateFullStaticImageUrl(urls[0], getImagePrefix(imageType)),
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : "";
    logger.error(`optimizeImage error: ${errorMessage}`, { stack: errorStack });
    // Unlike the other images, an image waiting for its slot fails for real
    // so the page that uploaded it can tell it could not be processed.
    if (slot && !isAttached) {
      const isInSlot = await discardPendingImage(destinationId);
      await dropIncomingImage(imageType, destinationId);
      if (!isInSlot) {
        throw err;
      }
    }
    return { error: errorMessage };
  }
};

export default optimizeImage;
