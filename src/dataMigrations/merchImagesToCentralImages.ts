import prisma from "@mirlo/prisma";

import logger from "../logger";
import { backfillMerchImages } from "../scripts/backfillMerchImages";

import type { DataMigration } from ".";

const merchImagesToCentralImages: DataMigration = {
  name: "2026-10-merch-images-to-central-images",
  run: async () => {
    // Only prune unprocessed rows here. Rows whose files are missing are
    // skipped and keep serving from the legacy location as they do today:
    // there's nothing to copy, and deleting them waits for someone to run
    // the script with --prune.
    const summary = await backfillMerchImages({
      apply: true,
      prune: "unprocessed",
    });
    if (summary.missing > 0) {
      logger.warn(
        `dataMigrations: skipped ${summary.missing} merch images with no stored files. ` +
          "Run `yarn images:backfill-merch --apply --prune` to delete them."
      );
    }
    if (summary.failed > 0 || summary.pending > 0) {
      return false;
    }
    // If every file looks missing and none was ever found, storage is more
    // likely empty or misconfigured than all of them being gone, so try
    // again on the next boot.
    if (summary.missing > 0) {
      const found = await prisma.merchImage.count({
        where: { imageId: { not: null } },
      });
      return found > 0;
    }
    return true;
  },
};

export default merchImagesToCentralImages;
