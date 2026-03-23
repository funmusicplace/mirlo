#!/usr/bin/env node

import * as dotenv from "dotenv";
dotenv.config();

import yargs from "yargs";
import { Job, Worker } from "bullmq";
import winston from "winston";
import uploadAudioJob from "./upload-audio";
import verifyAudioJob from "./verify-audio";
import generateAlbumJob from "./generate-album";
import optimizeImage from "./optimize-image";
import cleanUpOldFilesJob from "./clean-up-old-files";
import sendPostNotification from "./send-post-notification";
import { autoPurchaseNewAlbumsProcessor } from "../queues/auto-purchase-new-albums-queue";

import sendMail from "./send-mail";

import "../queues/send-mail-queue";
import "../queues/send-post-notification-queue";
import "../queues/auto-purchase-new-albums-queue";

import { REDIS_CONFIG } from "../config/redis";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "background-queue" },
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

const workerOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

yargs // eslint-disable-line
  .command("run", "starts file processing queue", (argv: any) => {
    logger.info("STARTING WORKER QUEUE");
    audioQueue();
    // audioDurationQueue();
    verifyAudioQueue();
    imageQueue();
    generateAlbumQueueWorker();
    sendMailQueue();
    sendPostNotificationQueue();
    autoPurchaseNewAlbumsQueue();
    cleanUpFilesQueue();
  })
  .help().argv;

async function imageQueue() {
  const worker = new Worker("optimize-image", optimizeImage, workerOptions);
  logger.info("Optimize Image worker started");

  worker.on("completed", (job: Job) => {
    logger.info("completed:optimize-image");
  });

  worker.on("failed", (job?: Job, err?: any) => {
    logger.error("failed:optimize-image", err);
  });

  worker.on("error", (err: any) => {
    logger.error("error:optimize-image", err);
  });
}

async function sendMailQueue() {
  const worker = new Worker("send-mail", sendMail, {
    ...workerOptions,
  });
  logger.info("Send mail worker started");

  worker.on("completed", (job: Job) => {
    logger.info("completed:send-mail");
  });

  worker.on("failed", (job?: Job, err?: any) => {
    logger.error("failed:send-mail", err);
  });

  worker.on("error", (err: any) => {
    logger.error("error:send-mail", err);
  });
}

async function sendPostNotificationQueue() {
  const worker = new Worker("send-post-notification", sendPostNotification, {
    ...workerOptions,
  });
  logger.info("Send post notification worker started");

  worker.on("completed", (job: Job) => {
    logger.info("completed:send-post-notification");
  });

  worker.on("failed", (job?: Job, err?: any) => {
    logger.error("failed:send-post-notification", err);
  });

  worker.on("error", (err: any) => {
    logger.error("error:send-post-notification", err);
  });
}

async function autoPurchaseNewAlbumsQueue() {
  const worker = new Worker(
    "auto-purchase-new-albums",
    autoPurchaseNewAlbumsProcessor,
    {
      ...workerOptions,
    }
  );
  logger.info("Auto-purchase new albums worker started");

  worker.on("completed", (job: Job) => {
    logger.info("completed:auto-purchase-new-albums");
  });

  worker.on("failed", (job?: Job, err?: any) => {
    logger.error("failed:auto-purchase-new-albums", err);
  });

  worker.on("error", (err: any) => {
    logger.error("error:auto-purchase-new-albums", err);
  });
}

async function audioQueue() {
  const worker = new Worker("upload-audio", uploadAudioJob, workerOptions);
  logger.info("Upload Audio worker started");

  worker.on("completed", (job: any) => {
    logger.info("completed:upload-audio");
  });

  worker.on("failed", (job: any, err: any) => {
    logger.error("failed:upload-audio", err);
  });

  worker.on("error", (err: any) => {
    logger.error("error:upload-audio", err);
  });
}

async function verifyAudioQueue() {
  const worker = new Worker("verify-audio", verifyAudioJob, workerOptions);
  logger.info("Verify Audio worker started");

  worker.on("completed", (job: any) => {
    logger.info("completed:verify-audio");
  });

  worker.on("failed", (job: any, err: any) => {
    logger.error("failed:verify-audio", err);
  });

  worker.on("error", (err: any) => {
    logger.error("error:verify-audio", err);
  });
}

export async function generateAlbumQueueWorker() {
  const worker = new Worker("generate-album", generateAlbumJob, {
    ...workerOptions,
    lockDuration: 10 * 60 * 1000, // 10 minutes
    lockRenewTime: 5 * 60 * 1000, // Renew every 5 minutes
  });
  logger.info("Generate Album worker started");

  worker.on("active", (job: any) => {
    logger.info(`active:generate-album: jobId=${job.id}`);
  });

  worker.on("completed", (job: any) => {
    logger.info(`completed:generate-album: jobId=${job.id}`);
  });

  worker.on("failed", (job: any, err: any) => {
    logger.error(`failed:generate-album: jobId=${job.id}`, err);
  });

  worker.on("error", (err: any) => {
    logger.error("error:generate-album", err);
  });
}

export async function cleanUpFilesQueue() {
  const worker = new Worker(
    "clean-up-old-files",
    cleanUpOldFilesJob,
    workerOptions
  );
  logger.info("clean up old files worker started");

  worker.on("completed", (job: any) => {
    logger.info("completed:clean-up-old-files");
  });

  worker.on("failed", (job: any, err: any) => {
    logger.error("failed:clean-up-old-files", err);
  });

  worker.on("error", (err: any) => {
    logger.error("error:clean-up-old-files", err);
  });
}
