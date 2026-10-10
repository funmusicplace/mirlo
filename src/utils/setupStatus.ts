import prisma from "@mirlo/prisma";
import { maxBy } from "lodash";

import { redisClient } from "../config/redis";
import { isEmailTransportConfigured } from "../jobs/send-mail";
import { logger } from "../logger";
import {
  COMPLETED_JOB_AGE_SECONDS,
  scheduledTasksQueue,
} from "../queues/scheduled-tasks-queue";
import { sendMailQueue } from "../queues/send-mail-queue";

import { backendStorage, bucketExists, currentBuckets } from "./minio";
import { hasInstanceName, SettingsType } from "./settings";

export type CheckStatus = "ok" | "warning" | "error";

export type ScheduledTaskStatus = {
  name: string;
  nextRunAt: string | null;
  lastCompletedAt: string | null;
  lastFailedAt: string | null;
};

export type SetupStatus = {
  checks: {
    database: { status: CheckStatus; migrations: number | null };
    redis: { status: CheckStatus };
    worker: { status: CheckStatus };
    scheduledTasks: {
      status: CheckStatus;
      enabled: boolean;
      tasks: ScheduledTaskStatus[];
    };
    publicAddress: {
      status: CheckStatus;
      apiDomainConfigured: boolean;
      clientRegistered: boolean;
    };
    storage: {
      status: CheckStatus;
      backend: "minio" | "backblaze";
      missingBuckets: number;
    };
  };
  steps: {
    identity: boolean;
    email: boolean;
    platformPolicy: boolean;
  };
};

const SCHEDULE_NAMES = [
  "every-minute-tasks",
  "every-day-tasks",
  "every-month-tasks",
];

const RECENT_JOBS = 200;

const COMPLETED_RETENTION_MS = COMPLETED_JOB_AGE_SECONDS * 1000;

const SCHEDULE_PERIOD_MS: Record<string, number> = {
  "every-minute-tasks": 10 * 60 * 1000,
  "every-day-tasks": 24 * 60 * 60 * 1000,
  "every-month-tasks": 31 * 24 * 60 * 60 * 1000,
};

const toIso = (timestamp: number | null | undefined) =>
  timestamp ? new Date(timestamp).toISOString() : null;

const checkDatabase = async (): Promise<SetupStatus["checks"]["database"]> => {
  try {
    const [row] = await prisma.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
    `;
    return { status: "ok", migrations: row?.count ?? 0 };
  } catch (e) {
    logger.error("setup status: database check failed", e);
    return { status: "error", migrations: null };
  }
};

const checkRedis = async (): Promise<SetupStatus["checks"]["redis"]> => {
  try {
    await redisClient.ping();
    return { status: "ok" };
  } catch (e) {
    logger.error("setup status: redis check failed", e);
    return { status: "error" };
  }
};

const checkWorker = async (): Promise<SetupStatus["checks"]["worker"]> => {
  try {
    const workers = await sendMailQueue.getWorkers();
    return { status: workers.length > 0 ? "ok" : "error" };
  } catch (e) {
    logger.error("setup status: worker check failed", e);
    return { status: "error" };
  }
};

const latestFinishedAt = (
  jobs: { name: string; finishedOn?: number }[],
  name: string
): number | null =>
  maxBy(
    jobs.filter((job) => job.name === name && job.finishedOn),
    (job) => job.finishedOn
  )?.finishedOn ?? null;

const checkScheduledTasks = async (): Promise<
  SetupStatus["checks"]["scheduledTasks"]
> => {
  try {
    const [schedulers, completed, failed] = await Promise.all([
      scheduledTasksQueue.getJobSchedulers(),
      scheduledTasksQueue.getJobs(["completed"], 0, RECENT_JOBS - 1),
      scheduledTasksQueue.getJobs(["failed"], 0, RECENT_JOBS - 1),
    ]);
    const enabled = schedulers.length > 0;
    const now = Date.now();
    const tasks = SCHEDULE_NAMES.map((name) => {
      const scheduler = schedulers.find((s) => s.key === name);
      return {
        name,
        nextRunAt: toIso(scheduler?.next),
        lastCompletedAt: toIso(latestFinishedAt(completed, name)),
        lastFailedAt: toIso(latestFinishedAt(failed, name)),
      };
    });
    const hasProblem = tasks.some((task) => {
      const next = task.nextRunAt ? Date.parse(task.nextRunAt) : null;
      const lastCompleted = task.lastCompletedAt
        ? Date.parse(task.lastCompletedAt)
        : null;
      const lastFailed = task.lastFailedAt
        ? Date.parse(task.lastFailedAt)
        : null;
      const notPickedUp =
        next === null || now - next > SCHEDULE_PERIOD_MS[task.name];
      const failedSince =
        lastFailed !== null &&
        now - lastFailed < COMPLETED_RETENTION_MS &&
        (lastCompleted === null || lastFailed > lastCompleted);
      return notPickedUp || failedSince;
    });
    const neverRan = tasks.every((task) => !task.lastCompletedAt);
    const status: CheckStatus = !enabled
      ? "warning"
      : hasProblem
        ? "error"
        : neverRan
          ? "warning"
          : "ok";
    return { status, enabled, tasks };
  } catch (e) {
    logger.error("setup status: scheduled tasks check failed", e);
    return { status: "error", enabled: false, tasks: [] };
  }
};

const checkPublicAddress = async (): Promise<
  SetupStatus["checks"]["publicAddress"]
> => {
  const apiDomainConfigured = Boolean(process.env.API_DOMAIN?.trim());
  let clientRegistered = false;
  try {
    clientRegistered =
      (await prisma.client.count({
        where: { status: "approved", applicationUrl: { not: "" } },
      })) > 0;
  } catch (e) {
    logger.error("setup status: client check failed", e);
  }
  return {
    status: apiDomainConfigured && clientRegistered ? "ok" : "warning",
    apiDomainConfigured,
    clientRegistered,
  };
};

const checkStorage = async (): Promise<SetupStatus["checks"]["storage"]> => {
  const { imageBuckets, audioBuckets, downloadBuckets } = currentBuckets();
  const buckets = [...imageBuckets, ...audioBuckets, ...downloadBuckets];
  const results = await Promise.all(
    buckets.map((bucket) =>
      bucketExists(bucket).catch((e) => {
        logger.error(`setup status: bucket check failed for ${bucket}`, e);
        return false;
      })
    )
  );
  const missingBuckets = results.filter((exists) => !exists).length;
  return {
    status:
      missingBuckets === 0
        ? "ok"
        : missingBuckets === buckets.length
          ? "error"
          : "warning",
    backend: backendStorage,
    missingBuckets,
  };
};

export const stepsFromSettings = (
  settings: SettingsType
): SetupStatus["steps"] => ({
  identity: hasInstanceName(settings),
  email: isEmailTransportConfigured(settings),
  platformPolicy: Boolean(
    settings.terms?.trim() || settings.contentPolicy?.trim()
  ),
});

export const getSetupStatus = async (
  settings: SettingsType
): Promise<SetupStatus> => {
  const [database, redis, worker, scheduledTasks, publicAddress, storage] =
    await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkWorker(),
      checkScheduledTasks(),
      checkPublicAddress(),
      checkStorage(),
    ]);
  return {
    checks: {
      database,
      redis,
      worker,
      scheduledTasks,
      publicAddress,
      storage,
    },
    steps: stepsFromSettings(settings),
  };
};
