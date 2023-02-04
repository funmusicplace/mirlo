import winston from "winston";
import sharp from "sharp";
import path from "path";
import bytes from "bytes";

import tempSharpConfig from "../config/sharp";
import { Job } from "bullmq";

const { defaultOptions, config: sharpConfig } = tempSharpConfig;

const MEDIA_LOCATION_INCOMING = process.env.MEDIA_LOCATION_INCOMING || "/";

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

/**
 * Convert and optimize track artworks to mozjpeg and webp
 */

const optimizeImage = async (job: Job) => {
  logger.info("optimizing");
  const { filepath, config = sharpConfig.artwork, destination } = job.data;

  logger.info(`passed ${JSON.stringify(config)}`);
  logger.info(`base ${MEDIA_LOCATION_INCOMING}`);
  logger.info(`input: ${filepath}`);
  try {
    const profiler = logger.startTimer();

    logger.info(`starting to optimize images ${filepath}`);

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
            const dest = path.join(
              `/data/media/images/${destination}${suffix}${ext}`
            );

            logger.info(`Destination: ${dest}`);

            let buffer: any;

            if (variant.extract) {
              logger.info({ extract: variant.extract });

              const extractOptions = Object.assign(
                { width, height },
                variant.extract
              );

              buffer = await sharp(filepath).extract(extractOptions).toBuffer();
            }

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

            buffer = await sharp(buffer || filepath)
              .resize(resizeOptions)
              [outputType](outputOptions)
              .toBuffer();

            if (variant.blur) {
              logger.info({ blur: variant.blur.sigma });

              buffer = await sharp(buffer).blur(variant.blur.sigma).toBuffer();
            }

            return new Promise((resolve, reject) => {
              return sharp(buffer)
                .toFile(dest)
                .then((result: any) => {
                  logger.info(
                    `Converted and optimized image to ${result.format}`,
                    {
                      size: bytes(result.size),
                      ratio: `${result.width}x${result.height})`,
                    }
                  );

                  return resolve(result);
                })
                .catch((err: any) => {
                  return reject(err);
                });
            });
          }
        );
      })
      .flat(1);

    await Promise.all(promises);

    profiler.done({ message: "Done optimizing image" });

    return Promise.resolve();
  } catch (err) {
    logger.error(err);
    return Promise.reject(err);
  }
};

export default optimizeImage;
