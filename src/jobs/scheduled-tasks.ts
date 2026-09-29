import { Job } from "bullmq";

import logger from "../logger";
import { scheduledTasksQueue } from "../queues/scheduled-tasks-queue";

import { dailyTasks } from "./every-day-tasks";
import { everyMinuteTasks } from "./every-minute-tasks";
import { monthlyTasks } from "./every-month-tasks";

const SCHEDULES: Record<string, { pattern: string; run: () => Promise<void> }> =
  {
    "every-minute-tasks": { pattern: "*/10 * * * *", run: everyMinuteTasks },
    "every-day-tasks": { pattern: "0 22 * * *", run: dailyTasks },
    "every-month-tasks": { pattern: "0 0 1 * *", run: monthlyTasks },
  };

export const registerScheduledTasks = async () => {
  for (const [name, { pattern }] of Object.entries(SCHEDULES)) {
    await scheduledTasksQueue.upsertJobScheduler(
      name,
      { pattern, tz: "UTC" },
      { name }
    );
    logger.info(`scheduled-tasks: registered ${name} (${pattern} UTC)`);
  }
};

export default async (job: Job) => {
  const schedule = SCHEDULES[job.name];
  if (!schedule) {
    throw new Error(`scheduled-tasks: unknown task ${job.name}`);
  }
  await schedule.run();
};
