import sharp from "sharp";
import ico from "sharp-ico";

import tempSharpConfig from "../config/sharp";
import { Job } from "bullmq";
import { uniq } from "lodash";
import {
  createBucketIfNotExists,
  getBufferFromStorage,
  removeObjectFromStorage,
  uploadWrapper,
} from "../utils/minio";
import prisma from "@mirlo/prisma";
import { logger } from "./queue-worker";
import { generateFullStaticImageUrl } from "../utils/images";
import fetch from "node-fetch";
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

        return variants.map(
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
              await uploadWrapper(finalMinioBucket, finalFileName, newBuffer, {
                contentType: `image/${outputType}`,
              });

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
      results.map((r?: { width?: number }) => `${destinationId}-x${r?.width}`)
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
      const faviconFinalName = `${destinationId}_artist_avatar_favicon.ico`;
      ico.sharpsToIco([sharp(buffer)], faviconFinalName, {
        sizes: [48],
        resizeOptions: {},
      });
      logger.info("Uploading artist avatar favicon to bucket");
      await uploadWrapper(finalMinioBucket, faviconFinalName, sharp(buffer));

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

    return Promise.resolve();
  } catch (err) {
    logger.error(`optimizeImage ${JSON.stringify(err)}`);
    return Promise.reject(err);
  }
};

export default optimizeImage;
