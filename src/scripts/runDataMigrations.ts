/**
 * Runs pending data migrations by hand (the background worker also runs them
 * on boot). See src/dataMigrations/index.ts.
 *
 * Usage:
 *   yarn data:migrate [--status]
 *   node --conditions=mirlo-dist dist/scripts/runDataMigrations.js [--status]
 */
import prisma from "@mirlo/prisma";

import { dataMigrations, runPendingDataMigrations } from "../dataMigrations";

const printStatus = async () => {
  const completed = await prisma.dataMigration.findMany();
  for (const migration of dataMigrations) {
    const record = completed.find((c) => c.name === migration.name);
    console.log(
      `${record ? `done ${record.completedAt.toISOString()}` : "pending"}  ${migration.name}`
    );
  }
};

if (require.main === module) {
  const run = process.argv.includes("--status")
    ? printStatus()
    : runPendingDataMigrations().then(({ ran, pending }) => {
        console.log(`Ran ${ran.length} of ${pending.length} pending.`);
        if (ran.length < pending.length) {
          process.exitCode = 1;
        }
      });
  run
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => process.exit());
}
