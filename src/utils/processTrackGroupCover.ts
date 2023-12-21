import sharpConfig from "../config/sharp";

import { SUPPORTED_IMAGE_MIME_TYPES } from "../config/supported-media-types";
import {
  createBucketIfNotExists,
  finalCoversBucket,
  incomingCoversBucket,
  minioClient,
} from "./minio";
import prisma from "../../prisma/prisma";
import { APIContext, checkFileTypeFromStream } from "./file";
import { logger } from "../jobs/queue-worker";
import imageQueue from "./processImages";

const { MINIO_HOST = "", MINIO_API_PORT = 9000 } = process.env;

const processTrackGroupCover = (ctx: APIContext) => {
  return async (trackGroupId: number) => {
    logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_API_PORT}`);
    logger.info("Uploading image to object storage");

    await createBucketIfNotExists(minioClient, incomingCoversBucket, logger);
    logger.info("Made bucket");
    ctx.req.pipe(ctx.req.busboy);

    const jobId = await new Promise((resolve, reject) => {
      ctx.req.busboy.on("file", async (_fieldname, fileStream, fileInfo) => {
        // FIXME: There's no way to test for this without consuming a part
        // of the stream
        // try {
        //   await checkFileTypeFromStream(
        //     ctx,
        //     fileStream,
        //     SUPPORTED_IMAGE_MIME_TYPES,
        //     logger
        //   );
        // } catch (e) {
        //   return reject(e);
        // }
        const image = await prisma.trackGroupCover.upsert({
          create: {
            originalFilename: fileInfo.filename,
            trackGroupId: Number(trackGroupId),
          },
          update: {
            originalFilename: fileInfo.filename,
          },
          where: {
            trackGroupId: Number(trackGroupId),
          },
        });

        logger.info(
          `Going to put a file on MinIO Bucket ${incomingCoversBucket}: ${image.id}, ${fileInfo.filename}`
        );
        await minioClient.putObject(incomingCoversBucket, image.id, fileStream);

        logger.info("Adding image to queue");

        const job = await imageQueue.add("optimize-image", {
          destination: image.id,
          model: "trackGroupCover",
          incomingMinioBucket: incomingCoversBucket,
          finalMinioBucket: finalCoversBucket,
          config: sharpConfig.config["artwork"],
        });
        resolve(job.id);
      });
    }).catch((e) => {
      throw e;
    });
    return jobId;
  };
};

export default processTrackGroupCover;
