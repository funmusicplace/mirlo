import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  DataMigration,
  runPendingDataMigrations,
} from "../../src/dataMigrations";
import merchImagesToCentralImages from "../../src/dataMigrations/merchImagesToCentralImages";
import { clearTables, createMerch, createProfile, createUser } from "../utils";

const fakeMigration = (
  name: string,
  result: boolean | Error
): DataMigration & { calls: number } => {
  const migration = {
    name,
    calls: 0,
    run: async () => {
      migration.calls += 1;
      if (result instanceof Error) {
        throw result;
      }
      return result;
    },
  };
  return migration;
};

const recordedNames = async () =>
  (await prisma.dataMigration.findMany({ orderBy: { name: "asc" } })).map(
    (m) => m.name
  );

describe("dataMigrations", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("runs pending migrations in order and records them", async () => {
    const first = fakeMigration("a-first", true);
    const second = fakeMigration("b-second", true);

    const result = await runPendingDataMigrations([first, second]);

    assert.deepEqual(result, {
      ran: ["a-first", "b-second"],
      pending: ["a-first", "b-second"],
    });
    assert.deepEqual(await recordedNames(), ["a-first", "b-second"]);
  });

  it("skips migrations that already completed", async () => {
    await prisma.dataMigration.create({ data: { name: "a-first" } });
    const first = fakeMigration("a-first", true);
    const second = fakeMigration("b-second", true);

    const result = await runPendingDataMigrations([first, second]);

    assert.equal(first.calls, 0);
    assert.equal(second.calls, 1);
    assert.deepEqual(result.ran, ["b-second"]);
  });

  it("doesn't record an unfinished migration and stops there", async () => {
    const first = fakeMigration("a-first", false);
    const second = fakeMigration("b-second", true);

    const result = await runPendingDataMigrations([first, second]);

    assert.deepEqual(result.ran, []);
    assert.equal(second.calls, 0);
    assert.deepEqual(await recordedNames(), []);
  });

  it("doesn't record a migration that throws and stops there", async () => {
    const first = fakeMigration("a-first", true);
    const second = fakeMigration("b-second", new Error("boom"));
    const third = fakeMigration("c-third", true);

    const result = await runPendingDataMigrations([first, second, third]);

    assert.deepEqual(result.ran, ["a-first"]);
    assert.equal(third.calls, 0);
    assert.deepEqual(await recordedNames(), ["a-first"]);
  });

  it("retries an unfinished migration on the next run", async () => {
    let finished = false;
    const flaky: DataMigration = {
      name: "a-flaky",
      run: async () => finished,
    };

    await runPendingDataMigrations([flaky]);
    finished = true;
    const result = await runPendingDataMigrations([flaky]);

    assert.deepEqual(result.ran, ["a-flaky"]);
    assert.deepEqual(await recordedNames(), ["a-flaky"]);
  });
});

describe("dataMigrations: merchImagesToCentralImages", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("finishes when there's nothing left to migrate", async () => {
    assert.equal(await merchImagesToCentralImages.run(), true);
  });

  it("stays pending while a recent upload may still be processing", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const merch = await createMerch(profile.id, {});
    const upload = await prisma.merchImage.create({
      data: { merchId: merch.id },
    });

    assert.equal(await merchImagesToCentralImages.run(), false);
    assert.ok(await prisma.merchImage.findUnique({ where: { id: upload.id } }));
  });

  it("prunes stale unprocessed images but keeps ones whose files look missing", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const merch = await createMerch(profile.id, {});
    const missing = await prisma.merchImage.create({
      data: { merchId: merch.id, url: ["gone-x600"] },
    });
    const unprocessed = await prisma.merchImage.create({
      data: {
        merchId: merch.id,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    });

    assert.equal(await merchImagesToCentralImages.run(), false);
    assert.ok(
      await prisma.merchImage.findUnique({ where: { id: missing.id } })
    );
    assert.equal(
      await prisma.merchImage.findUnique({ where: { id: unprocessed.id } }),
      null
    );
  });
});
