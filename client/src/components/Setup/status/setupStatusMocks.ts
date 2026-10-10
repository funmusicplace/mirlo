import type { SetupStatus } from "queries/admin";

export const HEALTHY_SETUP_STATUS: SetupStatus = {
  checks: {
    database: { status: "ok", migrations: 41 },
    redis: { status: "ok" },
    worker: { status: "ok" },
    scheduledTasks: {
      status: "ok",
      enabled: true,
      tasks: [
        {
          name: "every-minute-tasks",
          nextRunAt: "2026-10-08T18:00:00.000Z",
          lastCompletedAt: "2026-10-08T17:50:00.000Z",
          lastFailedAt: null,
        },
        {
          name: "every-day-tasks",
          nextRunAt: "2026-10-08T22:00:00.000Z",
          lastCompletedAt: "2026-10-07T22:00:00.000Z",
          lastFailedAt: null,
        },
        {
          name: "every-month-tasks",
          nextRunAt: "2026-11-01T00:00:00.000Z",
          lastCompletedAt: null,
          lastFailedAt: null,
        },
      ],
    },
    publicAddress: {
      status: "ok",
      apiDomainConfigured: true,
      clientRegistered: true,
    },
    storage: { status: "ok", backend: "minio", missingBuckets: 0 },
  },
  steps: { identity: true, email: true, platformPolicy: true },
};

export const TROUBLED_SETUP_STATUS: SetupStatus = {
  ...HEALTHY_SETUP_STATUS,
  checks: {
    ...HEALTHY_SETUP_STATUS.checks,
    worker: { status: "error" },
    scheduledTasks: {
      status: "warning",
      enabled: true,
      tasks: HEALTHY_SETUP_STATUS.checks.scheduledTasks.tasks.map((task) => ({
        ...task,
        lastCompletedAt: null,
      })),
    },
    storage: { status: "warning", backend: "backblaze", missingBuckets: 2 },
  },
  steps: { identity: true, email: false, platformPolicy: false },
};
