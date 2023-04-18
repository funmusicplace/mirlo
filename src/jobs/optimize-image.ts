import winston from "winston";
import sharp from "sharp";
import path from "path";
import bytes from "bytes";

import tempSharpConfig from "../config/sharp";
import { Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { uniq } from "lodash";
import * as Minio from "minio";
import {
  createBucketIfNotExists,
  finalCoversBucket,
  incomingCoversBucket,
} from "../utils/minio";

const { defaultOptions, config: sharpConfig } = tempSharpConfig;

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  MINIO_PORT = 9000,
  NODE_ENV,
} = process.env;
const prisma = new PrismaClient();

// Instantiate the minio client with the endpoint
// and access keys as shown below.
const minioClient = new Minio.Client({
  endPoint: MINIO_HOST,
  port: +MINIO_PORT,
  useSSL: NODE_ENV !== "development",
  accessKey: MINIO_ROOT_USER,
  secretKey: MINIO_ROOT_PASSWORD,
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "convert-optimize-image" },
  transports: [
    new winston.transports.Console({
      level: "debug",
    }),
    new winston.transports.File({
      filename: "error.log",
      level: "error",
    }),
  ],
});

async function getObjectFromMinio(
  filename: string
): Promise<{ buffer: Buffer; size: number }> {
  return new Promise(
    (resolve: (result: { buffer: Buffer; size: number }) => any, reject) => {
      logger.info(
        `Getting object from MinIO Bucket ${incomingCoversBucket}: ${filename}`
      );
      const buff: Buffer[] = [];
      var size = 0;
      minioClient
        .getObject(incomingCoversBucket, filename)
        .then(function (dataStream) {
          logger.info("Got stream");
          dataStream.on("data", async function (chunk) {
            buff.push(chunk);
            size += chunk.length;
          });
          dataStream.on("end", function () {
            logger.info("End. Total size = " + size);
            resolve({ buffer: Buffer.concat(buff), size });
          });
          dataStream.on("error", function (err) {
            logger.error(err);
            reject(err);
          });
        })
        .catch(reject);
    }
  );
}

/**
 * Convert and optimize track artworks to mozjpeg and webp
 */

const optimizeImage = async (job: Job) => {
  const { filepath, config = sharpConfig.artwork, destination } = job.data;

  // logger.info(`passed ${JSON.stringify(config)}`);
  // logger.info(`base ${MEDIA_LOCATION_INCOMING}`);
  // logger.info(`input: ${filepath}`);
  try {
    const profiler = logger.startTimer();

    logger.info(`Starting to optimize images ${destination}`);
    const { buffer, size } = await getObjectFromMinio(destination);
    await createBucketIfNotExists(minioClient, finalCoversBucket, logger);

    logger.info(`Got object of size ${size}`);
    const promises = Object.entries(config)
      .map(([key, value]) => {
        const outputType = key as "webp" | "jpeg"; // output type (jpeg, webp)
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

            logger.info("getting object from MinIO");

            let newBuffer = await sharp(buffer)
              .rotate()
              .resize(resizeOptions)
              [outputType](outputOptions)
              .toBuffer();
            logger.info("created size of object");

            logger.info("Uploading image to bucket");
            await minioClient.putObject(
              finalCoversBucket,
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
    await prisma.trackGroupCover.update({
      where: { id: destination },
      data: { url: urls },
    });

    profiler.done({ message: "Done optimizing image" });
    logger.info(`Removing from Bucket ${incomingCoversBucket}`);

    await minioClient.removeObject(incomingCoversBucket, destination);

    return Promise.resolve();
  } catch (err) {
    logger.error(err);
    return Promise.reject(err);
  }
};

export default optimizeImage;
