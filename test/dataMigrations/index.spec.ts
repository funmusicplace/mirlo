import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  DataMigration,
  dataMigrations,
  loadDataMigrations,
  migrationFilePattern,
  runPendingDataMigrations,
} from "../../src/dataMigrations";
import postContentImageRefs from "../../src/dataMigrations/migrations/20261002000000_postContentImageRefs";
import imageContentTypes from "../../src/dataMigrations/migrations/20261003000000_imageContentTypes";
import postContentWidgetPaths from "../../src/dataMigrations/migrations/20261004000000_postContentWidgetPaths";
import orphanedAudio from "../../src/dataMigrations/migrations/20261005000000_orphanedAudio";
import approveSelfOwnedLabelRows from "../../src/dataMigrations/migrations/20261006000000_approveSelfOwnedLabelRows";
import defaultInstanceLogo from "../../src/dataMigrations/migrations/20261018120000_defaultInstanceLogo";
import sanitizePostContent from "../../src/dataMigrations/migrations/20261022000000_sanitizePostContent";
import {
  DEFAULT_BUCKET_CONFIG,
  getImagesBucket,
  getAudioBucket,
  setBucketConfig,
  statFile,
  uploadAudioHlsFile,
  uploadIncomingAudio,
  uploadOptimizedImageByType,
  uploadWrapper,
} from "../../src/utils/minio";
import {
  clearTables,
  createPost,
  createPostImage,
  createProfile,
  createSiteSettings,
  createTrack,
  createTrackGroup,
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

describe("dataMigrations: loading", () => {
  let dir: string;

  const writeMigration = (file: string, name: string) =>
    fs.writeFileSync(
      path.join(dir, file),
      `exports.default = { name: ${JSON.stringify(name)}, run: async () => true };`
    );

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "data-migrations-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("loads every file in migrations/, in filename order", () => {
    const files = fs
      .readdirSync(path.join(__dirname, "../../src/dataMigrations/migrations"))
      .filter((f) => !f.endsWith(".map"));

    assert.ok(files.every((f) => migrationFilePattern.test(f)));
    assert.deepEqual(
      dataMigrations.map((m) => m.name),
      [
        postContentImageRefs,
        imageContentTypes,
        postContentWidgetPaths,
        orphanedAudio,
        approveSelfOwnedLabelRows,
        defaultInstanceLogo,
        sanitizePostContent,
      ].map((m) => m.name)
    );
    assert.equal(dataMigrations.length, files.length);
  });

  it("sorts by filename and ignores files that don't match the pattern", () => {
    writeMigration("20260102000000_second.js", "second");
    writeMigration("20260101000000_first.js", "first");
    writeMigration("helper.js", "helper");
    fs.writeFileSync(path.join(dir, "20260101000000_first.js.map"), "{}");

    assert.deepEqual(
      loadDataMigrations(dir).map((m) => m.name),
      ["first", "second"]
    );
  });

  it("throws on a file without a default-exported migration", () => {
    fs.writeFileSync(path.join(dir, "20260101000000_broken.js"), "");

    assert.throws(() => loadDataMigrations(dir), /20260101000000_broken\.js/);
  });

  it("throws on duplicate migration names", () => {
    writeMigration("20260101000000_one.js", "same");
    writeMigration("20260102000000_two.js", "same");

    assert.throws(
      () => loadDataMigrations(dir),
      /duplicate migration name same/
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
    const image = await createPostImage(post);
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

describe("dataMigrations: defaultInstanceLogo", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const createInstance = async (setupCompletedAt: Date | null) => {
    const row = await createSiteSettings({
      instanceCustomization: { title: "Mirlo", showHeroOnHome: true },
    });
    return prisma.settings.update({
      where: { id: row.id },
      data: { setupCompletedAt },
    });
  };

  it("gives an instance already in use the Mirlo logos, tinted", async () => {
    await createInstance(new Date());

    assert.equal(await defaultInstanceLogo.run(), true);

    const settings = await prisma.settings.findFirstOrThrow({
      include: { logo: true, mobileLogo: true },
    });
    assert.equal(settings.logo?.mimeType, "image/svg+xml");
    assert.equal(settings.logo?.originalFilename, "Logo-With-Wordmark.svg");
    assert.equal(
      settings.mobileLogo?.originalFilename,
      "Logo_Mirlo_Transparent_RedCircle.svg"
    );
    assert.equal(settings.settings?.instanceCustomization?.tintLogo, true);
    assert.equal(settings.settings?.instanceCustomization?.title, "Mirlo");
    assert.equal(
      settings.settings?.instanceCustomization?.showHeroOnHome,
      true
    );
  });

  it("leaves a fresh install without a logo", async () => {
    await createInstance(null);

    assert.equal(await defaultInstanceLogo.run(), true);

    const settings = await prisma.settings.findFirstOrThrow();
    assert.equal(settings.logoId, null);
    assert.equal(settings.mobileLogoId, null);
    assert.equal(settings.settings?.instanceCustomization?.tintLogo, undefined);
  });

  it("keeps a logo the admin already uploaded", async () => {
    const row = await createInstance(new Date());
    const logo = await prisma.instanceLogo.create({
      data: { mimeType: "image/png", extension: "png", width: 10, height: 4 },
    });
    await prisma.settings.update({
      where: { id: row.id },
      data: { logoId: logo.id },
    });

    assert.equal(await defaultInstanceLogo.run(), true);

    const settings = await prisma.settings.findFirstOrThrow();
    assert.equal(settings.logoId, logo.id);
    assert.equal(settings.mobileLogoId, null);
    assert.equal(await prisma.instanceLogo.count(), 1);
  });

  it("leaves an instance that already has a mobile logo alone", async () => {
    const row = await createInstance(new Date());
    const icon = await prisma.instanceLogo.create({
      data: {
        mimeType: "image/svg+xml",
        extension: "svg",
        width: 1,
        height: 1,
      },
    });
    await prisma.settings.update({
      where: { id: row.id },
      data: { mobileLogoId: icon.id },
    });

    assert.equal(await defaultInstanceLogo.run(), true);

    const settings = await prisma.settings.findFirstOrThrow();
    assert.equal(settings.mobileLogoId, icon.id);
    assert.equal(settings.logoId, null);
    assert.equal(settings.settings?.instanceCustomization?.tintLogo, undefined);
  });

  it("does nothing when the instance has no settings yet", async () => {
    assert.equal(await defaultInstanceLogo.run(), true);
    assert.equal(await prisma.instanceLogo.count(), 0);
  });
});

describe("dataMigrations: imageContentTypes", () => {
  const storedMetadata = async (key: string) => {
    const { minioStat } = await statFile(getImagesBucket(), key);
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
    await uploadWrapper(getImagesBucket(), key, Buffer.from("image"), {
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
});

describe("dataMigrations: postContentWidgetPaths", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("makes this instance's widget urls relative without touching updatedAt", async () => {
    await prisma.client.create({
      data: {
        applicationName: "frontend",
        applicationUrl: "https://mirlo.example",
      },
    });
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const otherInstance = `<iframe src="https://other.example/widget/track/2"></iframe>`;
    const post = await createPost(profile.id);
    const updatedAt = new Date("2024-01-01T00:00:00.000Z");
    await prisma.post.update({
      where: { id: post.id },
      data: {
        content: `<p>Listen</p><iframe src="https://mirlo.example/widget/trackGroup/1" height="371"></iframe>${otherInstance}`,
        updatedAt,
      },
    });

    assert.equal(await postContentWidgetPaths.run(), true);
    const migrated = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
    });
    assert.equal(
      migrated.content,
      `<p>Listen</p><iframe src="/widget/trackGroup/1" height="371"></iframe>${otherInstance}`
    );
    assert.equal(migrated.updatedAt.toISOString(), updatedAt.toISOString());

    assert.equal(await postContentWidgetPaths.run(), true);
    const rerun = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
    });
    assert.equal(rerun.content, migrated.content);
  });
});

describe("dataMigrations: sanitizePostContent", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("strips scripts from existing posts without touching updatedAt", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const post = await createPost(profile.id);
    const updatedAt = new Date("2024-01-01T00:00:00.000Z");
    const embed = `<iframe src="/widget/trackGroup/1" data-embed-type="custom" allow="autoplay; fullscreen"></iframe>`;
    await prisma.post.update({
      where: { id: post.id },
      data: {
        content: `<p onclick="alert(1)">Hi</p><iframe srcdoc="<script>alert(2)</script>"></iframe>${embed}`,
        updatedAt,
      },
    });
    const clean = await createPost(profile.id, { content: `<p>Clean</p>` });

    assert.equal(await sanitizePostContent.run(), true);
    const migrated = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
    });
    assert.equal(
      migrated.content,
      `<p>Hi</p><iframe allow="autoplay; fullscreen"></iframe>${embed}`
    );
    assert.equal(migrated.updatedAt.toISOString(), updatedAt.toISOString());
    const other = await prisma.post.findUniqueOrThrow({
      where: { id: clean.id },
    });
    assert.equal(other.updatedAt.toISOString(), clean.updatedAt.toISOString());

    assert.equal(await sanitizePostContent.run(), true);
    const rerun = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
    });
    assert.equal(rerun.content, migrated.content);
  });
});

describe("dataMigrations: orphanedAudio", () => {
  beforeEach(async () => {
    await clearTables();
  });
  afterEach(() => setBucketConfig(DEFAULT_BUCKET_CONFIG));

  const storeAudio = async (audioId: string) => {
    await uploadIncomingAudio(audioId, Readable.from(Buffer.from("audio")));
    await uploadAudioHlsFile(
      audioId,
      "segment-000.ts",
      Readable.from(Buffer.from("audio"))
    );
  };

  const incomingExists = async (incomingKey: string) =>
    !!(await statFile(getAudioBucket(), incomingKey)).minioStat;

  const segmentExists = async (audioId: string) =>
    !!(await statFile(getAudioBucket(), `${audioId}/segment-000.ts`)).minioStat;

  it("removes audio with no live TrackAudio row", async () => {
    setBucketConfig({ prefix: "" });
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const trackGroup = await createTrackGroup(profile.id);
    const liveTrack = await createTrack(trackGroup.id);
    const deletedTrack = await createTrack(trackGroup.id);
    const live = await prisma.trackAudio.findFirstOrThrow({
      where: { trackId: liveTrack.id },
    });
    const deleted = await prisma.trackAudio.findFirstOrThrow({
      where: { trackId: deletedTrack.id },
    });
    await prisma.trackAudio.delete({ where: { id: deleted.id } });
    const unknown = "00000000-0000-4000-8000-000000000000";

    await Promise.all([live.id, deleted.id, unknown].map(storeAudio));

    assert.equal(await orphanedAudio.run(), true);

    assert.equal(await segmentExists(live.id), true);
    assert.equal(await incomingExists(`incoming/${live.id}`), true);
    for (const audioId of [deleted.id, unknown]) {
      assert.equal(await segmentExists(audioId), false);
      assert.equal(await incomingExists(`incoming/${audioId}`), false);
    }
  });

  it("leaves keys that aren't audio ids alone", async () => {
    setBucketConfig({ prefix: "" });
    await uploadWrapper(getAudioBucket(), "not-an-audio-id", Buffer.from("x"));

    assert.equal(await orphanedAudio.run(), true);

    const { minioStat } = await statFile(getAudioBucket(), "not-an-audio-id");
    assert.ok(minioStat);
  });
});

describe("dataMigrations: approveSelfOwnedLabelRows", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("approves label rows on profiles the label owns and leaves the rest", async () => {
    const { user: label } = await createUser({ email: "label@test.com" });
    const { user: artist } = await createUser({ email: "artist@test.com" });
    const owned = await createProfile(label.id, { urlSlug: "owned" });
    const other = await createProfile(artist.id, { urlSlug: "other" });
    await prisma.artistLabel.createMany({
      data: [
        { artistId: owned.id, labelUserId: label.id, isArtistApproved: true },
        { artistId: other.id, labelUserId: label.id, isLabelApproved: true },
      ],
    });

    assert.equal(await approveSelfOwnedLabelRows.run(), true);

    const ownedRow = await prisma.artistLabel.findFirstOrThrow({
      where: { artistId: owned.id },
    });
    assert.equal(ownedRow.isArtistApproved, true);
    assert.equal(ownedRow.isLabelApproved, true);
    const otherRow = await prisma.artistLabel.findFirstOrThrow({
      where: { artistId: other.id },
    });
    assert.equal(otherRow.isArtistApproved, false);
    assert.equal(otherRow.isLabelApproved, true);
  });
});
