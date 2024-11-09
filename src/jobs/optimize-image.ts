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
import prisma from "@mirlo/prisma";
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
    destinationId,
    model,
    incomingMinioBucket,
    finalMinioBucket,
  } = job.data;

  try {
    const profiler = logger.startTimer();
    logger.info(
      `MinIO is at ${MINIO_HOST}:${MINIO_API_PORT} ${MINIO_ROOT_USER}`
    );

    logger.info(`Starting to optimize images ${model}/${destinationId}`);
    const { buffer, size } = await getBufferFromMinio(
      minioClient,
      incomingMinioBucket,
      destinationId,
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
            width?: number;
            height?: number;
            suffix?: any;
          }) => {
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

            const outputOptions = Object.assign(
              {},
              defaultOptions[outputType].outputOptions,
              options,
              variant.outputOptions || {}
            );

            let newBuffer;
            try {
              newBuffer = await sharp(buffer)
                .rotate()
                .resize(resizeOptions)
                [outputType](outputOptions)
                .toBuffer();
              logger.info(
                `created size ${resizeOptions.width}x${resizeOptions.height} for ${outputType}`
              );

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
            } catch (e) {
              console.error(e);
            }
          }
        );
      })
      .flat(1);

    const results = await Promise.all(promises);
    const urls = uniq(
      results.map((r: { width: number }) => `${destinationId}-x${r.width}`)
    ) as string[];
    logger.info(`Saving URLs [${urls.join(", ")}]`);

    if (model === "trackGroupCover") {
      await prisma.trackGroupCover.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    } else if (model === "artistBanner") {
      await prisma.artistBanner.update({
        where: { id: destinationId },
        data: { url: urls },
      });
    } else if (model === "artistAvatar") {
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
    logger.info(`Removing from Bucket ${incomingCoversBucket}`);

    await minioClient.removeObject(incomingCoversBucket, destinationId);

    if (process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET) {
      const searchParams = new URLSearchParams();
      searchParams.append("url", urls[urls.length - 1]);
      searchParams.append("models", "nudity-2.1");
      searchParams.append("api_user", process.env.SIGHTENGINE_USER);
      searchParams.append("api_secret", process.env.SIGHTENGINE_SECRET);

      console.log(searchParams.toString());

      await fetch(
        `https://api.sightengine.com/1.0/check.json?${searchParams.toString()}`,
        {
          method: "GET",
        }
      );
    }

    return Promise.resolve();
  } catch (err) {
    logger.error(`optimizeImage ${JSON.stringify(err)}`);
    return Promise.reject(err);
  }
};

export default optimizeImage;
