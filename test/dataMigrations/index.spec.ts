import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { afterEach, beforeEach, describe, it } from "mocha";

import {
  DataMigration,
  runPendingDataMigrations,
} from "../../src/dataMigrations";
import imageContentTypes from "../../src/dataMigrations/imageContentTypes";
import merchImagesToCentralImages from "../../src/dataMigrations/merchImagesToCentralImages";
import postContentImageRefs from "../../src/dataMigrations/postContentImageRefs";
import {
  finalCoversBucket,
  finalImageBucket,
  setBucketConfig,
  statFile,
  uploadOptimizedImageByType,
  uploadWrapper,
} from "../../src/utils/minio";
import {
  clearTables,
  createMerch,
  createPost,
  createProfile,
  createUser,
} from "../utils";

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

  it("prunes stale unprocessed images and skips ones whose files are missing", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const merch = await createMerch(profile.id, {});
    const stored = await prisma.merchImage.create({
      data: { merchId: merch.id },
    });
    await prisma.merchImage.update({
      where: { id: stored.id },
      data: { url: [`${stored.id}-x600`] },
    });
    await uploadOptimizedImageByType(
      "merch",
      `${stored.id}-x600.webp`,
      Buffer.from("image"),
      { contentType: "image/webp" }
    );
    const missing = await prisma.merchImage.create({
      data: { merchId: merch.id, url: ["gone-x600"] },
    });
    const unprocessed = await prisma.merchImage.create({
      data: {
        merchId: merch.id,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    });

    assert.equal(await merchImagesToCentralImages.run(), true);
    const migrated = await prisma.merchImage.findUniqueOrThrow({
      where: { id: stored.id },
    });
    assert.equal(migrated.imageId, stored.id);
    const skipped = await prisma.merchImage.findUniqueOrThrow({
      where: { id: missing.id },
    });
    assert.equal(skipped.imageId, null);
    assert.equal(
      await prisma.merchImage.findUnique({ where: { id: unprocessed.id } }),
      null
    );
  });

  it("stays pending when no image's files can be found at all", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const merch = await createMerch(profile.id, {});
    const missing = await prisma.merchImage.create({
      data: { merchId: merch.id, url: ["gone-x600"] },
    });

    assert.equal(await merchImagesToCentralImages.run(), false);
    assert.ok(
      await prisma.merchImage.findUnique({ where: { id: missing.id } })
    );
  });
});

describe("dataMigrations: postContentImageRefs", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("adds image ids to existing posts without touching updatedAt", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const post = await createPost(profile.id);
    const image = await prisma.postImage.create({
      data: { postId: post.id, mimeType: "image/jpeg", extension: "jpg" },
    });
    const updatedAt = new Date("2024-01-01T00:00:00.000Z");
    const external = `<img src="https://example.org/cat.gif">`;
    await prisma.post.update({
      where: { id: post.id },
      data: {
        content: `<p>Hi</p><img src="https://cdn.example.com/post-images/${image.id}.jpg">${external}`,
        updatedAt,
      },
    });
    const untouched = await createPost(profile.id, {
      content: `<p>No images</p>`,
    });

    assert.equal(await postContentImageRefs.run(), true);
    const migrated = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
    });
    assert.equal(
      migrated.content,
      `<p>Hi</p><img src="https://cdn.example.com/post-images/${image.id}.jpg" data-image-id="${image.id}">${external}`
    );
    assert.equal(migrated.updatedAt.toISOString(), updatedAt.toISOString());
    const other = await prisma.post.findUniqueOrThrow({
      where: { id: untouched.id },
    });
    assert.equal(
      other.updatedAt.toISOString(),
      untouched.updatedAt.toISOString()
    );

    assert.equal(await postContentImageRefs.run(), true);
    const rerun = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
    });
    assert.equal(rerun.content, migrated.content);
  });
});

describe("dataMigrations: imageContentTypes", () => {
  beforeEach(() => setBucketConfig({ prefix: "" }));
  afterEach(() => setBucketConfig(null));

  const storedMetadata = async (key: string) => {
    const { minioStat } = await statFile(finalImageBucket, key);
    return minioStat?.metaData;
  };

  it("stores the content type and cache control on local uploads", async () => {
    await uploadOptimizedImageByType(
      "trackGroupCover",
      "typed-cover-x600.webp",
      Buffer.from("image"),
      { contentType: "image/webp", cacheControl: "public, max-age=60" }
    );

    const metadata = await storedMetadata(
      "trackgroup-covers/typed-cover-x600.webp"
    );
    assert.equal(metadata?.["content-type"], "image/webp");
    assert.equal(metadata?.["cache-control"], "public, max-age=60");
  });

  it("re-saves images that have no content type, keeping cache control", async () => {
    const key = "trackgroup-covers/untyped-cover-x600.jpg";
    await uploadWrapper(finalImageBucket, key, Buffer.from("image"), {
      cacheControl: "public, max-age=60",
    });
    assert.notEqual(
      (await storedMetadata(key))?.["content-type"],
      "image/jpeg"
    );

    assert.equal(await imageContentTypes.run(), true);

    const metadata = await storedMetadata(key);
    assert.equal(metadata?.["content-type"], "image/jpeg");
    assert.equal(metadata?.["cache-control"], "public, max-age=60");
  });

  it("does nothing in the legacy layout", async () => {
    setBucketConfig(null);
    const key = "legacy-cover-x600.jpg";
    await uploadWrapper(finalCoversBucket, key, Buffer.from("image"));

    assert.equal(await imageContentTypes.run(), true);

    const { minioStat } = await statFile(finalCoversBucket, key);
    assert.notEqual(minioStat?.metaData?.["content-type"], "image/jpeg");
  });
});
