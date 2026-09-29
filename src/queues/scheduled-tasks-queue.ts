import { Queue } from "bullmq";

import { REDIS_CONFIG } from "../config/redis";

export const scheduledTasksQueue = new Queue("scheduled-tasks", {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { age: 7 * 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 30 * 24 * 60 * 60, count: 1000 },
  },
});
