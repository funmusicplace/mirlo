import { Request, Response } from "express";
import { User, PrismaClient } from "@prisma/client";

import { Queue, QueueEvents } from "bullmq";
import { promises as fs } from "fs";
import path from "path";
import shasum from "shasum";
import winston from "winston";
import dimensions from "image-size";
import { fromFile } from "file-type";
// import { Track, File } from "../db/models";

import sharpConfig from "../config/sharp";

import {
  // FIXME: HIGH_RES_AUDIO_MIME_TYPES,
  SUPPORTED_AUDIO_MIME_TYPES,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "../config/supported-media-types";
import { REDIS_CONFIG } from "../config/redis";
import sendMail from "../jobs/send-mail";

const prisma = new PrismaClient();

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || "/";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "process-file" },
  transports: [
    new winston.transports.Console({
      level: "debug",
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      filename: "error.log",
      level: "error",
    }),
  ],
});

const queueOptions = {
  prefix: "nomads",
  connection: REDIS_CONFIG,
};

export const imageQueue = new Queue("optimize-image", queueOptions);

const imageQueueEvents = new QueueEvents("optimize-image", queueOptions);

imageQueueEvents.on("stalled", () => {
  console.log("stalled");
});

imageQueueEvents.on("added", () => {
  console.log("started a job");
});

imageQueueEvents.on("error", () => {
  console.log("errored");
});

imageQueueEvents.on("completed", async (jobId: any) => {
  logger.info(`Job with id ${jobId} has been completed`);

  try {
    const job = await imageQueue.getJob(jobId);
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
    logger.error(err);
  }
});

export const processTrackGroupCover = (ctx: {
  req: Request;
  res: Response;
}) => {
  return async (file: any, trackGroupId: number) => {
    const { size: fileSize, path: filepath } = file;
    const type = await fromFile(filepath);
    const mime = type !== null && type !== undefined ? type.mime : file.type;
    const isImage = SUPPORTED_IMAGE_MIME_TYPES.includes(mime);

    if (!isImage) {
      console.log("not image");
      ctx.res.status(400);
      throw `File type not supported: ${mime}`;
    }

    const buffer = await fs.readFile(filepath);
    // const sha1sum = shasum(buffer);

    const image = await prisma.trackGroupCover.upsert({
      create: {
        originalFilename: file.originalFilename,
        trackGroupId: Number(trackGroupId),
      },
      update: {
        originalFilename: file.originalFilename,
      },
      where: {
        trackGroupId: Number(trackGroupId),
      },
    });

    const { config = "artwork" }: { config: "artwork" | "avatar" | "banner" } =
      ctx.req.body; // sharp config key
    const { width, height } = await dimensions(filepath);

    // const image = await prisma.image.findFirst({
    //   where: {
    //     id: filename,
    //   },
    // });

    // const metadata = file.metadata || {};

    // file.metadata = Object.assign(metadata, {
    //   dimensions: { width, height },
    // });

    // await file.save();

    logger.info("Adding image to queue");

    imageQueue.add("optimize-image", {
      filepath,
      destination: image.id,
      config: sharpConfig.config[config],
    });

    return image;
  };
};

export default processTrackGroupCover;
