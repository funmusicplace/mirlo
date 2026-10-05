import assert from "node:assert";

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import * as dotenv from "dotenv";
dotenv.config();
import { afterEach, beforeEach, describe, it } from "mocha";

import { backfillMerchImages } from "../../src/scripts/backfillMerchImages";
import {
  BucketConfig,
  listImagesByType,
  setBucketConfig,
  uploadOptimizedImageByType,
} from "../../src/utils/minio";
import { getSiteSettings } from "../../src/utils/settings";
import { clearTables, createMerch, createProfile, createUser } from "../utils";

const layouts: { name: string; config: BucketConfig | null }[] = [
  { name: "legacy buckets", config: null },
  { name: "consolidated buckets", config: { prefix: "" } },
];

describe("scripts/backfillMerchImages", () => {
  for (const layout of layouts) {
    describe(layout.name, () => {
      beforeEach(async () => {
        await clearTables();
        await getSiteSettings();
        await prisma.settings.updateMany({
          data: { bucketNames: layout.config ?? Prisma.DbNull },
        });
        setBucketConfig(layout.config);
      });

      afterEach(() => {
        setBucketConfig(null);
      });

      const seed = async () => {
        const { user } = await createUser({ email: "artist@artist.com" });
        const profile = await createProfile(user.id);
        const merch = await createMerch(profile.id, {});

        const stored = await prisma.merchImage.create({
          data: { merchId: merch.id },
        });
        const url = [`${stored.id}-x600`, `${stored.id}-original`];
        await prisma.merchImage.update({
          where: { id: stored.id },
          data: { url },
        });
        for (const name of url) {
          await uploadOptimizedImageByType(
            "merch",
            `${name}.webp`,
            Buffer.from(name),
            { contentType: "image/webp" }
          );
        }

        // Optimized URLs recorded, but the files are gone from storage.
        const missing = await prisma.merchImage.create({
          data: { merchId: merch.id, url: ["gone-x600"], position: 1 },
        });
        // Uploaded, but optimization never finished.
        const unprocessed = await prisma.merchImage.create({
          data: { merchId: merch.id, position: 2 },
        });

        const reloaded = await prisma.merchImage.findUniqueOrThrow({
          where: { id: stored.id },
        });
        return { stored: reloaded, missing, unprocessed };
      };

      it("reports without writing on a dry run", async () => {
        const { stored } = await seed();

        const summary = await backfillMerchImages({ apply: false });

        assert.deepEqual(summary, {
          migrated: 1,
          missing: 1,
          unprocessed: 1,
          failed: 0,
        });
        const after = await prisma.merchImage.findUniqueOrThrow({
          where: { id: stored.id },
        });
        assert.equal(after.imageId, null);
        assert.deepEqual(await listImagesByType("image", stored.id), []);
      });

      it("copies files and links a central Image with the same id, url and updatedAt", async () => {
        const { stored, missing, unprocessed } = await seed();

        const summary = await backfillMerchImages({ apply: true });

        assert.deepEqual(summary, {
          migrated: 1,
          missing: 1,
          unprocessed: 1,
          failed: 0,
        });

        const linked = await prisma.merchImage.findUniqueOrThrow({
          where: { id: stored.id },
          include: { image: true },
        });
        assert.equal(linked.imageId, stored.id);
        assert.deepEqual(linked.image?.url, stored.url);
        assert.equal(
          linked.image?.updatedAt.getTime(),
          stored.updatedAt.getTime()
        );

        assert.deepEqual((await listImagesByType("image", stored.id)).sort(), [
          `${stored.id}-original.webp`,
          `${stored.id}-x600.webp`,
        ]);
        // The source is left alone.
        assert.equal((await listImagesByType("merch", stored.id)).length, 2);

        for (const skipped of [missing, unprocessed]) {
          const row = await prisma.merchImage.findUniqueOrThrow({
            where: { id: skipped.id },
          });
          assert.equal(row.imageId, null);
        }
      });

      it("is safe to re-run", async () => {
        await seed();
        await backfillMerchImages({ apply: true });

        const second = await backfillMerchImages({ apply: true });

        assert.equal(second.migrated, 0);
        assert.equal(second.failed, 0);
      });

      it("respects the limit", async () => {
        await seed();

        const summary = await backfillMerchImages({ apply: false, limit: 1 });

        assert.equal(
          summary.migrated + summary.missing + summary.unprocessed,
          1
        );
      });
    });
  }
});
