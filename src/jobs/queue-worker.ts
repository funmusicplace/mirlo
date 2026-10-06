#!/usr/bin/env node

import { Job, Worker } from "bullmq";
import * as dotenv from "dotenv";
dotenv.config();
import winston from "winston";
import yargs from "yargs";

import { REDIS_CONFIG } from "../config/redis";
import { runPendingDataMigrations } from "../dataMigrations";
import { autoPurchaseNewAlbumsProcessor } from "../queues/auto-purchase-new-albums-queue";
import {
  setBucketConfig,
  BucketConfig,
  ensureAllBucketsExist,
} from "../utils/minio";
import { getSiteSettings } from "../utils/settings";

import cleanUpOldFilesJob from "./clean-up-old-files";
import generateAlbumJob from "./generate-album";
import optimizeImage from "./optimize-image";
import scheduledTasksJob, {
  registerScheduledTasks,
  removeScheduledTasks,
} from "./scheduled-tasks";
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

// change bucket config at runtime
const withFreshBucketConfig =
  (processor: (job: Job) => Promise<any>) => async (job: Job) => {
    const settings = await getSiteSettings();
    setBucketConfig((settings.bucketNames as BucketConfig | null) ?? null);
    return processor(job);
  };

const formatMb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

// Memory logging for queues.
const withMemoryLogging =
  (queueName: string, processor: (job: Job) => Promise<any>) =>
  async (job: Job) => {
    const before = process.memoryUsage();
    logger.info(
      `memory:${queueName}: jobId=${job.id} start rss=${formatMb(before.rss)} heapUsed=${formatMb(before.heapUsed)}`
    );
    try {
      return await processor(job);
    } finally {
      const after = process.memoryUsage();
      logger.info(
        `memory:${queueName}: jobId=${job.id} end rss=${formatMb(after.rss)} heapUsed=${formatMb(after.heapUsed)} rssDelta=${formatMb(after.rss - before.rss)}`
      );
    }
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
  const worker = new Worker(
    queueName,
    withMemoryLogging(queueName, withFreshBucketConfig(processor)),
    options
  );
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

// Let in-flight jobs finish before exiting, so a deploy doesn't kill a
// scheduled task (which is never retried) partway through
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, closing workers`);
  try {
    await Promise.all(workers.map((worker) => worker.close()));
    process.exit(0);
  } catch (e) {
    logger.error("Error closing workers", e);
    process.exit(1);
  }
};
yargs
  .command("run", "starts file processing queue", async (argv: any) => {
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.on("unhandledRejection", (reason) => {
      logger.error(`Unhandled promise rejection: ${reason}`);
    });
    const settings = await getSiteSettings();
    setBucketConfig((settings.bucketNames as BucketConfig | null) ?? null);
    ensureAllBucketsExist().catch((e) => {
      logger.error("Failed to eagerly create storage buckets on boot");
      logger.error(e);
    });
    startDataMigrations();
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
    scheduledTasksQueueWorker();
  })
  .help().argv;

function startDataMigrations() {
  if (process.env.DATA_MIGRATIONS_ENABLED === "false") {
    logger.info("Data migrations disabled (DATA_MIGRATIONS_ENABLED=false)");
    return;
  }
  runPendingDataMigrations().catch((e) => {
    logger.error("Data migrations failed to run", e);
  });
}

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

export async function scheduledTasksQueueWorker() {
  if (process.env.SCHEDULED_TASKS_ENABLED === "false") {
    logger.info("Scheduled tasks disabled (SCHEDULED_TASKS_ENABLED=false)");
    removeScheduledTasks().catch((e) => {
      logger.error("Failed to remove scheduled tasks", e);
    });
    return;
  }

  createWorkerWithLogging(
    "scheduled-tasks",
    scheduledTasksJob,
    {
      ...workerOptions,
      concurrency: 1,
      // Never re-run a stalled task (it may have sent emails), and give it a
      // long lock so heavy jobs elsewhere in this process don't make it stall
      maxStalledCount: 0,
      lockDuration: 10 * 60 * 1000, // 10 minutes
      lockRenewTime: 5 * 60 * 1000, // Renew every 5 minutes
    },
    "Scheduled tasks worker started",
    true // includeActiveEvent
  );
  registerScheduledTasks().catch((e) => {
    // Exit so the platform restarts us, rather than running with nothing scheduled
    logger.error("Failed to register scheduled tasks", e);
    process.exit(1);
  });
}
