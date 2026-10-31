import { Queue } from "bullmq";

import { REDIS_CONFIG } from "../config/redis";

export const moderateImageQueue = new Queue("moderate-image", {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
  defaultJobOptions: {
    removeOnComplete: { age: 2 * 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 14 * 24 * 60 * 60, count: 5000 },
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
  },
});
