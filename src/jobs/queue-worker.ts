#!/usr/bin/env node

import { Job, Worker } from "bullmq";
import * as dotenv from "dotenv";
import winston from "winston";
import yargs from "yargs";

dotenv.config();

import { REDIS_CONFIG } from "../config/redis";
import { autoPurchaseNewAlbumsProcessor } from "../queues/auto-purchase-new-albums-queue";

import cleanUpOldFilesJob from "./clean-up-old-files";
import generateAlbumJob from "./generate-album";
import optimizeImage from "./optimize-image";
import sendMail from "./send-mail";
import sendPostNotification from "./send-post-notification";
import uploadAudioJob from "./upload-audio";
import verifyAudioJob from "./verify-audio";

import "../queues/send-mail-queue";
import "../queues/send-post-notification-queue";
import "../queues/auto-purchase-new-albums-queue";

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

const workers: Worker[] = [];

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
  workers.push(worker);
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

// Handle graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Close all workers - this will wait for in-flight jobs to complete
    // with a default timeout of 30 seconds per job
    await Promise.all(
      workers.map((worker) =>
        worker.close().catch((err) => {
          logger.error(`Error closing worker:`, err);
        })
      )
    );
    logger.info("All workers closed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

// Register signal handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  gracefulShutdown("uncaughtException");
});

yargs
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
      lockDuration: 60 * 60 * 1000, // 1 hour
      lockRenewTime: 30 * 60 * 1000, // Renew every 30 minutes
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
