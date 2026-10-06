/**
 * One-off data and storage migrations: work a Prisma migration can't do,
 * like copying files between buckets. The background worker runs pending
 * ones on boot, so hosted and self-hosted instances both pick them up on
 * their next deploy without anyone having to remember a script.
 *
 * Each completed migration is recorded by name in the DataMigration table and
 * never runs again. To add one, append it to `dataMigrations` (order matters:
 * the runner stops at the first one that isn't done). A migration must be
 * safe to re-run, because a run that fails or returns false is retried on the
 * next boot. Never rename one that has shipped.
 *
 * Code that only exists to support the pre-migration state can be removed
 * once a release has shipped the migration and self-hosters have had time to
 * upgrade through it.
 */
import prisma from "@mirlo/prisma";

import logger from "../logger";

import merchImagesToCentralImages from "./merchImagesToCentralImages";

export type DataMigration = {
  /** Recorded in the DataMigration table. Never rename once shipped. */
  name: string;
  /** Resolves true when finished, false to try again on the next boot. */
  run: () => Promise<boolean>;
};

export const dataMigrations: DataMigration[] = [merchImagesToCentralImages];

export const runPendingDataMigrations = async (
  migrations: DataMigration[] = dataMigrations
) => {
  const completed = await prisma.dataMigration.findMany({
    select: { name: true },
  });
  const completedNames = completed.map((c) => c.name);
  const pending = migrations.filter((m) => !completedNames.includes(m.name));

  const ran: string[] = [];
  for (const migration of pending) {
    logger.info(`dataMigrations: running ${migration.name}`);
    let done = false;
    try {
      done = await migration.run();
    } catch (e) {
      logger.error(`dataMigrations: ${migration.name} failed`, e);
    }
    if (!done) {
      // Later migrations may depend on this one, so don't run them yet.
      logger.warn(
        `dataMigrations: ${migration.name} isn't finished, will retry on next boot`
      );
      break;
    }
    await prisma.dataMigration.create({ data: { name: migration.name } });
    logger.info(`dataMigrations: ${migration.name} complete`);
    ran.push(migration.name);
  }
  return { ran, pending: pending.map((m) => m.name) };
};
