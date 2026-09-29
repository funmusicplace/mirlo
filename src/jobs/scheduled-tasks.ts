import { Job } from "bullmq";

import logger from "../logger";
import { scheduledTasksQueue } from "../queues/scheduled-tasks-queue";

import { dailyTasks } from "./every-day-tasks";
import { everyMinuteTasks } from "./every-minute-tasks";
import { monthlyTasks } from "./every-month-tasks";

const SCHEDULES = {
  "every-minute-tasks": { pattern: "*/10 * * * *", run: everyMinuteTasks },
  "every-day-tasks": { pattern: "0 22 * * *", run: dailyTasks },
  "every-month-tasks": { pattern: "0 0 1 * *", run: monthlyTasks },
} as const;

type ScheduleName = keyof typeof SCHEDULES;

const isScheduleName = (name: string): name is ScheduleName =>
  Object.hasOwn(SCHEDULES, name);

const TZ = "UTC";

export const registerScheduledTasks = async () => {
  const existing = await scheduledTasksQueue.getJobSchedulers();

  // Schedulers persist in Redis, so drop any that were renamed or removed here
  for (const { key } of existing) {
    if (!isScheduleName(key)) {
      await scheduledTasksQueue.removeJobScheduler(key);
      logger.info(`scheduled-tasks: removed stale scheduler ${key}`);
    }
  }

  for (const [name, { pattern }] of Object.entries(SCHEDULES)) {
    const current = existing.find((s) => s.key === name);
    const pendingJob =
      current?.next !== undefined
        ? await scheduledTasksQueue.getJob(`repeat:${name}:${current.next}`)
        : undefined;
    if (current?.pattern === pattern && current.tz === TZ && pendingJob) {
      logger.info(`scheduled-tasks: ${name} already scheduled`);
      continue;
    }

    await scheduledTasksQueue.upsertJobScheduler(
      name,
      { pattern, tz: TZ },
      { name }
    );
    logger.info(`scheduled-tasks: registered ${name} (${pattern} ${TZ})`);
  }
};

export const removeScheduledTasks = async () => {
  const existing = await scheduledTasksQueue.getJobSchedulers();
  for (const { key } of existing) {
    await scheduledTasksQueue.removeJobScheduler(key);
    logger.info(`scheduled-tasks: removed scheduler ${key}`);
  }
};

export default async (job: Job) => {
  if (!isScheduleName(job.name)) {
    throw new Error(`scheduled-tasks: unknown task ${job.name}`);
  }
  await SCHEDULES[job.name].run();
};
