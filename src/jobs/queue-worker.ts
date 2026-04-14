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

/**
 * Factory function to create a worker with standard event logging
 */
function createWorkerWithLogging(
  queueName: string,
  processor: any,
  options: any,
  startupMessage: string,
  includeActiveEvent = false
): Worker {
  const worker = new Worker(queueName, processor, options);
  logger.info(startupMessage);

  if (includeActiveEvent) {
    worker.on("active", (job: Job) => {
      logger.info(`active:${queueName}: jobId=${job.id}`);
    });
  }

  worker.on("completed", (job: Job) => {
    logger.info(
      includeActiveEvent
        ? `completed:${queueName}: jobId=${job.id}`
        : `completed:${queueName}`
    );
  });

  worker.on("failed", (job?: Job, err?: any) => {
    logger.error(
      includeActiveEvent
        ? `failed:${queueName}: jobId=${job?.id}`
        : `failed:${queueName}`,
      err
    );
  });

  worker.on("error", (err: any) => {
    logger.error(`error:${queueName}`, err);
  });

  return worker;
}

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
  createWorkerWithLogging(
    "optimize-image",
    optimizeImage,
    workerOptions,
    "Optimize Image worker started"
  );
}

async function sendMailQueue() {
  createWorkerWithLogging(
    "send-mail",
    sendMail,
    workerOptions,
    "Send mail worker started"
  );
}

async function sendPostNotificationQueue() {
  createWorkerWithLogging(
    "send-post-notification",
    sendPostNotification,
    workerOptions,
    "Send post notification worker started"
  );
}

async function autoPurchaseNewAlbumsQueue() {
  createWorkerWithLogging(
    "auto-purchase-new-albums",
    autoPurchaseNewAlbumsProcessor,
    workerOptions,
    "Auto-purchase new albums worker started"
  );
}

async function audioQueue() {
  createWorkerWithLogging(
    "upload-audio",
    uploadAudioJob,
    workerOptions,
    "Upload Audio worker started"
  );
}

async function verifyAudioQueue() {
  createWorkerWithLogging(
    "verify-audio",
    verifyAudioJob,
    workerOptions,
    "Verify Audio worker started"
  );
}

export async function generateAlbumQueueWorker() {
  createWorkerWithLogging(
    "generate-album",
    generateAlbumJob,
    {
      ...workerOptions,
      lockDuration: 10 * 60 * 1000, // 10 minutes
      lockRenewTime: 5 * 60 * 1000, // Renew every 5 minutes
    },
    "Generate Album worker started",
    true // includeActiveEvent
  );
}

export async function cleanUpFilesQueue() {
  createWorkerWithLogging(
    "clean-up-old-files",
    cleanUpOldFilesJob,
    workerOptions,
    "clean up old files worker started"
  );
}
