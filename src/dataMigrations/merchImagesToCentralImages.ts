import logger from "../logger";
import { backfillMerchImages } from "../scripts/backfillMerchImages";

import type { DataMigration } from ".";

const merchImagesToCentralImages: DataMigration = {
  name: "2026-10-merch-images-to-central-images",
  run: async () => {
    // Only prune unprocessed rows here. Rows whose files look missing could
    // just as well mean storage is empty or misconfigured, so deleting them
    // waits for someone to check and run the script with --prune.
    const summary = await backfillMerchImages({
      apply: true,
      prune: "unprocessed",
    });
    if (summary.missing > 0) {
      logger.warn(
        `dataMigrations: ${summary.missing} merch images have no stored files. ` +
          "Check storage, then run `yarn images:backfill-merch --apply --prune`."
      );
    }
    return (
      summary.failed === 0 && summary.pending === 0 && summary.missing === 0
    );
  },
};

export default merchImagesToCentralImages;
