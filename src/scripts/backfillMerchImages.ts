/**
 * Moves legacy merch images (MerchImage rows with no imageId, stored in the
 * merch-images location) onto central Image rows (stored at the root of the
 * images bucket). See .claude/plans/plan-centralImages.prompt.md.
 *
 * Each Image keeps the MerchImage's id, url and updatedAt, so the object keys
 * and the cache-busting version in served URLs stay the same — only the bucket
 * changes. Source objects are never deleted.
 *
 * Dry run by default. Usage:
 *   yarn images:backfill-merch [--apply] [--limit N]
 *   node --conditions=mirlo-dist dist/scripts/backfillMerchImages.js [--apply] [--limit N]
 */
import prisma from "@mirlo/prisma";

import {
  BucketConfig,
  copyImagesBetweenTypes,
  listImagesByType,
  setBucketConfig,
} from "../utils/minio";
import { getSiteSettings } from "../utils/settings";

export const backfillMerchImages = async ({
  apply,
  limit,
}: {
  apply: boolean;
  limit?: number;
}) => {
  const settings = await getSiteSettings();
  const bucketConfig = (settings.bucketNames as BucketConfig | null) ?? null;
  setBucketConfig(bucketConfig);

  console.log(
    `${apply ? "APPLYING" : "DRY RUN"} — bucket layout: ${
      bucketConfig ? `consolidated (prefix "${bucketConfig.prefix}")` : "legacy"
    }${limit ? `, limit ${limit}` : ""}`
  );

  const legacyImages = await prisma.merchImage.findMany({
    where: { imageId: null },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const summary = { migrated: 0, unprocessed: 0, missing: 0, failed: 0 };

  for (const merchImage of legacyImages) {
    const label = `${merchImage.id} (merch ${merchImage.merchId})`;

    if (merchImage.url.length === 0) {
      // The upload never finished optimizing, so there's nothing to serve.
      console.log(`unprocessed  ${label}`);
      summary.unprocessed += 1;
      continue;
    }

    try {
      if (!apply) {
        const files = await listImagesByType("merch", merchImage.id);
        if (files.length === 0) {
          console.log(`missing      ${label}`);
          summary.missing += 1;
        } else {
          console.log(`would copy   ${label}: ${files.length} files`);
          summary.migrated += 1;
        }
        continue;
      }

      const copied = await copyImagesBetweenTypes(
        "merch",
        "image",
        merchImage.id
      );
      if (copied.length === 0) {
        console.log(`missing      ${label}`);
        summary.missing += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        // findUnique skips the soft-delete filter, so a row left by an
        // earlier interrupted run is found and reused.
        const existing = await tx.image.findUnique({
          where: { id: merchImage.id },
        });
        if (!existing) {
          await tx.image.create({
            data: {
              id: merchImage.id,
              url: merchImage.url,
              dimensions: "square",
              createdAt: merchImage.createdAt,
              updatedAt: merchImage.updatedAt,
            },
          });
        }
        await tx.merchImage.update({
          where: { id: merchImage.id },
          data: { imageId: merchImage.id },
        });
      });

      console.log(`copied       ${label}: ${copied.length} files`);
      summary.migrated += 1;
    } catch (e) {
      console.error(`failed       ${label}`, e);
      summary.failed += 1;
    }
  }

  console.log(
    `\n${apply ? "Migrated" : "Would migrate"}: ${summary.migrated}, ` +
      `missing files: ${summary.missing}, unprocessed: ${summary.unprocessed}, ` +
      `failed: ${summary.failed}`
  );
  if (!apply) {
    console.log("Nothing was written. Re-run with --apply to migrate.");
  }
  return summary;
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;
  if (limit !== undefined && !(Number.isInteger(limit) && limit > 0)) {
    console.error("--limit needs a positive whole number");
    process.exit(1);
  }

  backfillMerchImages({ apply: args.includes("--apply"), limit })
    .then((summary) => process.exit(summary.failed > 0 ? 1 : 0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
