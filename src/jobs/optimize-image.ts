import sharp from "sharp";

import tempSharpConfig from "../config/sharp";
import { Job } from "bullmq";
import { uniq } from "lodash";
import {
  createBucketIfNotExists,
  getBufferFromMinio,
  incomingCoversBucket,
  minioClient,
} from "../utils/minio";
import prisma from "../../prisma/prisma";
import { logger } from "./queue-worker";

const { defaultOptions, config: sharpConfig } = tempSharpConfig;

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_API_PORT = 9000,
} = process.env;

/**
 * Convert and optimize track artworks to mozjpeg and webp
 */

const optimizeImage = async (job: Job) => {
  const {
    config = sharpConfig.artwork,
    destination,
    model,
    incomingMinioBucket,
    finalMinioBucket,
  } = job.data;

  try {
    const profiler = logger.startTimer();
    logger.info(
      `MinIO is at ${MINIO_HOST}:${MINIO_API_PORT} ${MINIO_ROOT_USER}`
    );

    logger.info(`Starting to optimize images ${destination}`);
    const { buffer, size } = await getBufferFromMinio(
      minioClient,
      incomingMinioBucket,
      destination,
      logger
    );

    await createBucketIfNotExists(minioClient, finalMinioBucket, logger);

    logger.info(`Got object of size ${size}`);
    const promises = Object.entries(config)
      .map(([key, value]) => {
        const outputType = key as "webp" | "jpeg" | "png"; // output type (jpeg, webp)
        const {
          // @ts-ignore
          options = {},
          // @ts-ignore
          variants = [],
          // @ts-ignore
          ext = defaultOptions[outputType].ext,
        } = value;

        return variants.map(
          async (variant: {
            extract?: any;
            resize?: any;
            outputOptions?: any;
            blur?: any;
            width?: any;
            height?: any;
            suffix?: any;
          }) => {
            const { width, height, suffix = `-x${width}` } = variant;

            const finalFileName = `${destination}${suffix}${ext}`;

            logger.info(`Destination: ${finalFileName}`);

            const resizeOptions = Object.assign(
              {
                width,
                height,
                withoutEnlargement: true,
              },
              variant.resize || {}
            );

            const outputOptions = Object.assign(
              {},
              defaultOptions[outputType].outputOptions,
              options,
              variant.outputOptions || {}
            );

            let newBuffer = await sharp(buffer)
              .rotate()
              .resize(resizeOptions)
              [outputType](outputOptions)
              .toBuffer();
            logger.info("created size of object");

            logger.info("Uploading image to bucket");
            await minioClient.putObject(
              finalMinioBucket,
              finalFileName,
              newBuffer
            );

            logger.info(`Converted and optimized image to ${outputType}`, {
              ratio: `${width}x${height})`,
            });
            return {
              width: width,
              height: height,
              format: outputType,
            };
          }
        );
      })
      .flat(1);

    const results = await Promise.all(promises);
    const urls = uniq(results.map((r) => `${destination}-x${r.width}`));
    logger.info(`Saving URLs [${urls.join(", ")}]`);

    if (model === "trackGroupCover") {
      await prisma.trackGroupCover.update({
        where: { id: destination },
        data: { url: urls },
      });
    } else if (model === "artistBanner") {
      await prisma.artistBanner.update({
        where: { id: destination },
        data: { url: urls },
      });
    } else if (model === "artistAvatar") {
      await prisma.artistAvatar.update({
        where: { id: destination },
        data: { url: urls },
      });
    }

    profiler.done({ message: "Done optimizing image" });
    logger.info(`Removing from Bucket ${incomingCoversBucket}`);

    await minioClient.removeObject(incomingCoversBucket, destination);

    return Promise.resolve();
  } catch (err) {
    logger.error(`optimizeImage ${JSON.stringify(err)}`);
    return Promise.reject(err);
  }
};

export default optimizeImage;
