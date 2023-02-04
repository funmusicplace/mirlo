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

const audioQueue = new Queue("convert-audio", queueOptions);

const audioQueueEvents = new QueueEvents("convert-audio", queueOptions);

audioQueueEvents.on("completed", async (jobId: any) => {
  logger.info(`Job with id ${jobId} has been completed`);

  try {
    const job = await audioQueue.getJob(jobId);

    if (job) {
      const file = await prisma.trackAudio.findFirst({
        where: {
          id: job.data.filename,
        },
      });
      if (file) {
        logger.info("found audio file");
        // FIXME: Add metadata to a track
        // const metadata = file.metadata || { variants: [] };
        // const variants = metadata.variants || [];

        // for (const result of job.returnvalue) {
        //   variants.push({
        //     format: "m4a",
        //     size: result.size,
        //     name: "audiofile",
        //   });
        // }

        // metadata.variants = variants;

        // await File.update(
        //   {
        //     // metadata: metadata,
        //     status: "ok",
        //   },
        //   {
        //     where: {
        //       id: job.data.filename, // uuid
        //     },
        //   }
        // );
      }
    }
  } catch (err) {
    logger.error(err);
  }
});

const audioDurationQueue = new Queue("audio-duration", queueOptions);

const audioDurationQueueEvents = new QueueEvents(
  "audio-duration",
  queueOptions
);

audioDurationQueueEvents.on("completed", async (jobId: any) => {
  try {
    const job = await audioDurationQueue.getJob(jobId);

    if (job) {
      // FIXME: add duration to a track
      // const file = await File.findOne({
      //   where: {
      //     id: job.data.filename,
      //   },
      // });
      // const track = await Track.findOne({
      //   where: {
      //     url: file.id,
      //   },
      // });
      // track.duration = job.returnvalue;
      // await track.save();
    }
  } catch (err) {
    logger.error(err);
  }
});

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

/*
 * Process a file then queue it for upload
 * @param {object} ctx Koa context
 * @returns {Promise} Promise object containing image
 */
export const processAudio = (ctx: { req: Request; res: Response }) => {
  return async (file: any) => {
    const { size: fileSize, path: filepath } = file;

    const type = await fromFile(filepath);
    const mime = type !== null && type !== undefined ? type.mime : file.type;

    const isAudio = SUPPORTED_AUDIO_MIME_TYPES.includes(mime);

    if (!isAudio) {
      ctx.res.status(400);
      throw `File type not supported: ${mime}`;
    }

    const buffer = await fs.readFile(filepath);
    const sha1sum = shasum(buffer);

    // create record for original file
    // const result = await File.create(
    //   {
    //     ownerId: (ctx.req.user as User).id,
    //     filename: file.originalFilename, // original file name
    //     size: fileSize,
    //     mime,
    //     hash: sha1sum,
    //   },
    //   { raw: true }
    // );

    // const { id: filename, filename: originalFilename } = result.dataValues; // uuid/v4

    const audio = await prisma.trackAudio.create({
      data: {
        originalFilename: file.originalFilename,
        size: fileSize,
        hash: sha1sum,
      },
    });

    try {
      await fs.rename(
        filepath,
        path.join(BASE_DATA_DIR, `/data/media/incoming/${audio.id}`)
      );
    } catch (e) {
      logger.error(e);
    }

    const data = Object.assign({}, audio, {
      filename: audio.id, // uuid filename
      filename_orig: audio.originalFilename,
    });

    logger.info("Parsing audio metadata");

    const mm = await import("music-metadata");

    const metadata = await mm.parseFile(
      path.join(BASE_DATA_DIR, `/data/media/incoming/${audio.id}`),
      {
        duration: true,
        skipCovers: true,
      }
    );

    logger.info("Done parsing audio metadata");

    logger.info("Creating new track");

    // TODO: extract metadata from file and put it on the
    // const track = await Track.create({
    //   title: metadata.common.title || originalFilename,
    //   creator_id: ctx.profile.id,
    //   url: filename,
    //   duration: metadata.format.duration || 0,
    //   artist: metadata.common.artist,
    //   album: metadata.common.album,
    //   year: metadata.common.year,
    //   album_artist: metadata.common.albumartist,
    //   number: metadata.common.track.no,
    //   createdAt: new Date().getTime() / 1000 | 0
    // })

    if (!metadata.format.duration) {
      audioDurationQueue.add("audio-duration", { filename: audio.id });
    }

    // FIXME: metadata
    // data.metadata = metadata.common;
    // data.track = track.get({ plain: true })

    logger.info("Adding audio to convert-audio queue");
    audioQueue.add("convert-audio", { filename: audio.id });

    return data;
  };
};

export default {
  processAudio,
  processTrackGroupCover,
};
