import winston from "winston";
import sharp from "sharp";
import path from "path";
import bytes from "bytes";

import tempSharpConfig from "../config/sharp";

const { defaultOptions, config: sharpConfig } = tempSharpConfig;

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || "/";
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

interface Job {
  data: {
    filename: any;
    config?: { artwork: { webp: { [key: string]: any } } };
  };
}

const optimizeImage = async (job: Job) => {
  logger.info("optimizing");
  const { filename, config = sharpConfig.artwork } = job.data;

  logger.info(`passed ${JSON.stringify(config)}`);
  logger.info("base", BASE_DATA_DIR);
  const input = path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`);

  try {
    const profiler = logger.startTimer();

    logger.info(`starting to optimize images ${filename}`);

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
              BASE_DATA_DIR,
              `/data/media/images/${filename}${suffix}${ext}`
            );

            let buffer: any;

            if (variant.extract) {
              logger.info({ extract: variant.extract });

              const extractOptions = Object.assign(
                { width, height },
                variant.extract
              );

              buffer = await sharp(input).extract(extractOptions).toBuffer();
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

            buffer = await sharp(buffer || input)
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
