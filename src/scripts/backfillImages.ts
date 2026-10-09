/**
 * Moves legacy images (stored in a per-type location such as merch-images)
 * onto central Image rows (stored at the root of the images
 * bucket). See .claude/plans/plan-centralImages.prompt.md.
 *
 * Each Image keeps the legacy row's id, url and updatedAt, so the object keys
 * and the cache-busting version in served URLs stay the same — only the bucket
 * changes. Source objects are never deleted.
 *
 * Rows that can't be migrated are left alone unless --prune is passed:
 * - missing: optimized URLs are recorded but the files are gone.
 * - unprocessed: the upload never finished optimizing. Rows younger than
 *   PENDING_HOURS count as pending instead, since their job may still run.
 * --prune deletes missing and unprocessed rows and whatever files they left.
 * They show a broken image or a spinner today, so nothing visible is lost.
 * Passing prune: "unprocessed" (as the data migrations do) only deletes
 * unprocessed rows: an empty or misconfigured bucket makes every row look
 * missing, so deleting those needs someone to check storage first.
 *
 * Dry run by default. Usage:
 *   yarn images:backfill <source> [--apply] [--prune] [--limit N]
 *   node --conditions=mirlo-dist dist/scripts/backfillImages.js <source> [--apply] [--prune] [--limit N]
 * where <source> is one of the keys of `imageSources`.
 */
import prisma from "@mirlo/prisma";

import { deleteMerchImage } from "../utils/merch";
import {
  BucketConfig,
  copyImagesBetweenTypes,
  ImageType,
  listImagesByType,
  removeIncomingImageByType,
  setBucketConfig,
} from "../utils/minio";
import { getSiteSettings } from "../utils/settings";

const PENDING_HOURS = 24;

type PrismaTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type LegacyImage = {
  id: string;
  url: string[];
  createdAt: Date;
  updatedAt: Date;
  profileId: number;
  label: string;
  link: (tx: PrismaTransactionClient) => Promise<unknown>;
  remove: () => Promise<unknown>;
};

export type LegacyImageSource = {
  imageType: ImageType;
  dimensions: string;
  findLegacy: (take?: number) => Promise<LegacyImage[]>;
  countLinked: () => Promise<number>;
};

export const merchImages: LegacyImageSource = {
  imageType: "merch",
  dimensions: "square",
  findLegacy: async (take) => {
    const rows = await prisma.merchImage.findMany({
      where: { imageId: null },
      include: { merch: { select: { profileId: true } } },
      orderBy: { createdAt: "asc" },
      take,
    });
    return rows.map((row) => ({
      ...row,
      profileId: row.merch.profileId,
      label: `${row.id} (merch ${row.merchId})`,
      link: (tx) =>
        tx.merchImage.update({
          where: { id: row.id },
          data: { imageId: row.id },
        }),
      remove: () => deleteMerchImage(row),
    }));
  },
  countLinked: () =>
    prisma.merchImage.count({ where: { imageId: { not: null } } }),
};

export const imageSources = {
  merch: merchImages,
};

export const backfillImages = async (
  source: LegacyImageSource,
  {
    apply,
    prune = false,
    limit,
  }: {
    apply: boolean;
    prune?: boolean | "unprocessed";
    limit?: number;
  }
) => {
  // The caller sets the in-memory bucket layout (the CLI below, or the worker
  // on boot). Setting it here would leak into whatever process calls this.
  const settings = await getSiteSettings();
  const bucketConfig = (settings.bucketNames as BucketConfig | null) ?? null;

  console.log(
    `${apply ? "APPLYING" : "DRY RUN"} ${source.imageType} — bucket layout: ${
      bucketConfig ? `consolidated (prefix "${bucketConfig.prefix}")` : "legacy"
    }${prune ? `, pruning${prune === true ? "" : ` ${prune} only`}` : ""}${limit ? `, limit ${limit}` : ""}`
  );

  const legacyImages = await source.findLegacy(limit);

  const summary = {
    migrated: 0,
    unprocessed: 0,
    pending: 0,
    missing: 0,
    pruned: 0,
    failed: 0,
  };
  const pendingCutoff = new Date(Date.now() - PENDING_HOURS * 60 * 60 * 1000);

  for (const legacy of legacyImages) {
    const { label } = legacy;

    const pruneRow = async (reason: "missing" | "unprocessed") => {
      summary[reason] += 1;
      if (prune !== true && prune !== reason) {
        console.log(`${reason.padEnd(12)} ${label}`);
        return;
      }
      if (apply) {
        await legacy.remove();
        if (reason === "unprocessed") {
          // The upload's original may still be waiting in incoming storage.
          await removeIncomingImageByType(source.imageType, legacy.id).catch(
            () => undefined
          );
        }
      }
      console.log(`${apply ? "deleted" : "would delete"} ${label} (${reason})`);
      summary.pruned += 1;
    };

    try {
      if (legacy.url.length === 0) {
        // The upload never finished optimizing, so there's nothing to serve.
        if (legacy.createdAt > pendingCutoff) {
          console.log(`pending      ${label}`);
          summary.pending += 1;
        } else {
          await pruneRow("unprocessed");
        }
        continue;
      }

      if (!apply) {
        const files = await listImagesByType(source.imageType, legacy.id);
        if (files.length === 0) {
          await pruneRow("missing");
        } else {
          console.log(`would copy   ${label}: ${files.length} files`);
          summary.migrated += 1;
        }
        continue;
      }

      const copied = await copyImagesBetweenTypes(
        source.imageType,
        "image",
        legacy.id
      );
      if (copied.length === 0) {
        await pruneRow("missing");
        continue;
      }

      await prisma.$transaction(async (tx) => {
        // findUnique skips the soft-delete filter, so a row left by an
        // earlier interrupted run is found and reused.
        const existing = await tx.image.findUnique({
          where: { id: legacy.id },
        });
        if (!existing) {
          await tx.image.create({
            data: {
              id: legacy.id,
              url: legacy.url,
              dimensions: source.dimensions,
              profileId: legacy.profileId,
              createdAt: legacy.createdAt,
              updatedAt: legacy.updatedAt,
            },
          });
        }
        await legacy.link(tx);
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
  if (summary.missing + summary.unprocessed > summary.pruned) {
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
  const sourceName = args[0] as keyof typeof imageSources;
  const source = imageSources[sourceName];
  if (!source) {
    console.error(
      `First argument must be one of: ${Object.keys(imageSources).join(", ")}`
    );
    process.exit(1);
  }
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;
  if (limit !== undefined && !(Number.isInteger(limit) && limit > 0)) {
    console.error("--limit needs a positive whole number");
    process.exit(1);
  }

  getSiteSettings()
    .then((settings) => {
      setBucketConfig((settings.bucketNames as BucketConfig | null) ?? null);
      return backfillImages(source, {
        apply: args.includes("--apply"),
        prune: args.includes("--prune"),
        limit,
      });
    })
    .then((summary) => process.exit(summary.failed > 0 ? 1 : 0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
