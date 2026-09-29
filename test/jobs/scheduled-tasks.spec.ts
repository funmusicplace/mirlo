import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { Job } from "bullmq";
import { describe, it, beforeEach, afterEach } from "mocha";

import { redisClient } from "../../src/config/redis";
import scheduledTasksJob, {
  registerScheduledTasks,
  removeScheduledTasks,
} from "../../src/jobs/scheduled-tasks";
import { scheduledTasksQueue } from "../../src/queues/scheduled-tasks-queue";

// Talks to the real test Redis instance; no DB required.
describe("scheduled-tasks", () => {
  const removeAllSchedulers = async () => {
    const schedulers = await scheduledTasksQueue.getJobSchedulers();
    await Promise.all(
      schedulers.map(({ key }) => scheduledTasksQueue.removeJobScheduler(key))
    );
  };

  beforeEach(removeAllSchedulers);
  afterEach(removeAllSchedulers);

  describe("registerScheduledTasks", () => {
    it("registers each task with its cron pattern in UTC", async () => {
      await registerScheduledTasks();

      const schedulers = await scheduledTasksQueue.getJobSchedulers();
      const byKey = Object.fromEntries(schedulers.map((s) => [s.key, s]));

      assert.deepStrictEqual(Object.keys(byKey).sort(), [
        "every-day-tasks",
        "every-minute-tasks",
        "every-month-tasks",
      ]);
      assert.equal(byKey["every-minute-tasks"].pattern, "*/10 * * * *");
      assert.equal(byKey["every-day-tasks"].pattern, "0 22 * * *");
      assert.equal(byKey["every-month-tasks"].pattern, "0 0 1 * *");
      schedulers.forEach((s) => assert.equal(s.tz, "UTC"));
    });

    it("is idempotent across restarts", async () => {
      await registerScheduledTasks();
      await registerScheduledTasks();

      assert.equal(await scheduledTasksQueue.getJobSchedulersCount(), 3);
    });

    it("removes schedulers that are no longer defined", async () => {
      await scheduledTasksQueue.upsertJobScheduler(
        "renamed-old-task",
        { pattern: "0 * * * *", tz: "UTC" },
        { name: "renamed-old-task" }
      );

      await registerScheduledTasks();

      const keys = (await scheduledTasksQueue.getJobSchedulers()).map(
        (s) => s.key
      );
      assert.ok(!keys.includes("renamed-old-task"));
      assert.equal(keys.length, 3);
    });
  });

  describe("pending jobs across restarts", () => {
    const getPendingJob = async (key: string) => {
      const scheduler = await scheduledTasksQueue.getJobScheduler(key);
      assert.ok(scheduler?.next, `expected ${key} to have a next run`);
      return scheduledTasksQueue.getJob(`repeat:${key}:${scheduler.next}`);
    };

    it("keeps the existing pending job rather than replacing it", async () => {
      // Replacing it would drop a run that came due while the worker was down
      await registerScheduledTasks();
      const before = await getPendingJob("every-month-tasks");
      assert.ok(before);

      await new Promise((resolve) => setTimeout(resolve, 5));
      await registerScheduledTasks();
      const after = await getPendingJob("every-month-tasks");

      assert.ok(after);
      assert.equal(after.timestamp, before.timestamp);
    });

    it("recreates a pending job that has gone missing", async () => {
      await registerScheduledTasks();
      const job = await getPendingJob("every-day-tasks");
      assert.ok(job);
      // BullMQ refuses job.remove() on scheduler jobs, so drop it in Redis
      await redisClient.del(`mirlo:scheduled-tasks:${job.id}`);
      assert.equal(await getPendingJob("every-day-tasks"), undefined);

      await registerScheduledTasks();

      assert.ok(await getPendingJob("every-day-tasks"));
    });
  });

  describe("removeScheduledTasks", () => {
    it("removes every scheduler", async () => {
      await registerScheduledTasks();

      await removeScheduledTasks();

      assert.equal(await scheduledTasksQueue.getJobSchedulersCount(), 0);
    });
  });

  describe("job processor", () => {
    it("rejects unknown task names", async () => {
      await assert.rejects(
        scheduledTasksJob({ name: "not-a-task" } as Job),
        /unknown task not-a-task/
      );
    });

    it("does not treat Object prototype keys as tasks", async () => {
      await assert.rejects(
        scheduledTasksJob({ name: "toString" } as Job),
        /unknown task toString/
      );
    });
  });
});
