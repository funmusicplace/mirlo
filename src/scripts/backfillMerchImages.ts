/**
 * Moves legacy merch images (MerchImage rows with no imageId, stored in the
 * merch-images location) onto central Image rows (stored at the root of the
 * images bucket). See .claude/plans/plan-centralImages.prompt.md.
 *
 * Each Image keeps the MerchImage's id, url and updatedAt, so the object keys
 * and the cache-busting version in served URLs stay the same — only the bucket
 * changes. Source objects are never deleted.
 *
 * Rows that can't be migrated are left alone unless --prune is passed:
 * - missing: optimized URLs are recorded but the files are gone.
 * - unprocessed: the upload never finished optimizing. Rows younger than
 *   PENDING_HOURS count as pending instead, since their job may still run.
 * --prune deletes missing and unprocessed rows and whatever files they left.
 * They show a broken image or a spinner today, so nothing visible is lost.
 *
 * Dry run by default. Usage:
 *   yarn images:backfill-merch [--apply] [--prune] [--limit N]
 *   node --conditions=mirlo-dist dist/scripts/backfillMerchImages.js [--apply] [--prune] [--limit N]
 */
import prisma from "@mirlo/prisma";

import { deleteMerchImage } from "../utils/merch";
import {
  BucketConfig,
  copyImagesBetweenTypes,
  listImagesByType,
  removeIncomingImageByType,
  setBucketConfig,
} from "../utils/minio";
import { getSiteSettings } from "../utils/settings";

const PENDING_HOURS = 24;

export const backfillMerchImages = async ({
  apply,
  prune = false,
  limit,
}: {
  apply: boolean;
  prune?: boolean;
  limit?: number;
}) => {
  const settings = await getSiteSettings();
  const bucketConfig = (settings.bucketNames as BucketConfig | null) ?? null;
  setBucketConfig(bucketConfig);

  console.log(
    `${apply ? "APPLYING" : "DRY RUN"} — bucket layout: ${
      bucketConfig ? `consolidated (prefix "${bucketConfig.prefix}")` : "legacy"
    }${prune ? ", pruning" : ""}${limit ? `, limit ${limit}` : ""}`
  );

  const legacyImages = await prisma.merchImage.findMany({
    where: { imageId: null },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const summary = {
    migrated: 0,
    unprocessed: 0,
    pending: 0,
    missing: 0,
    pruned: 0,
    failed: 0,
  };
  const pendingCutoff = new Date(Date.now() - PENDING_HOURS * 60 * 60 * 1000);

  for (const merchImage of legacyImages) {
    const label = `${merchImage.id} (merch ${merchImage.merchId})`;

    const pruneRow = async (reason: "missing" | "unprocessed") => {
      summary[reason] += 1;
      if (!prune) {
        console.log(`${reason.padEnd(12)} ${label}`);
        return;
      }
      if (apply) {
        await deleteMerchImage(merchImage);
        if (reason === "unprocessed") {
          // The upload's original may still be waiting in incoming storage.
          await removeIncomingImageByType("merch", merchImage.id).catch(
            () => undefined
          );
        }
      }
      console.log(`${apply ? "deleted" : "would delete"} ${label} (${reason})`);
      summary.pruned += 1;
    };

    try {
      if (merchImage.url.length === 0) {
        // The upload never finished optimizing, so there's nothing to serve.
        if (merchImage.createdAt > pendingCutoff) {
          console.log(`pending      ${label}`);
          summary.pending += 1;
        } else {
          await pruneRow("unprocessed");
        }
        continue;
      }

      if (!apply) {
        const files = await listImagesByType("merch", merchImage.id);
        if (files.length === 0) {
          await pruneRow("missing");
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
        await pruneRow("missing");
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
      `pending: ${summary.pending}, ` +
      `${apply ? "deleted" : "would delete"}: ${summary.pruned}, ` +
      `failed: ${summary.failed}`
  );
  if (!prune && summary.missing + summary.unprocessed > 0) {
    console.log(
      "Re-run with --prune to delete the missing and unprocessed images."
    );
  }
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

  backfillMerchImages({
    apply: args.includes("--apply"),
    prune: args.includes("--prune"),
    limit,
  })
    .then((summary) => process.exit(summary.failed > 0 ? 1 : 0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
