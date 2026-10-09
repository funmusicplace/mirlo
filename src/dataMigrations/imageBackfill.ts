import logger from "../logger";
import { backfillImages, imageSources } from "../scripts/backfillImages";

import type { DataMigration } from ".";

export const imageBackfillMigration = (
  name: string,
  sourceName: keyof typeof imageSources
): DataMigration => ({
  name,
  run: async () => {
    const source = imageSources[sourceName];
    const summary = await backfillImages(source, {
      apply: true,
      prune: "unprocessed",
    });
    if (summary.missing > 0) {
      logger.warn(
        `dataMigrations: skipped ${summary.missing} ${sourceName} images with no stored files. ` +
          `Run \`yarn images:backfill ${sourceName} --apply --prune\` to delete them.`
      );
    }
    if (summary.failed > 0 || summary.pending > 0) {
      return false;
    }
    if (summary.missing > 0) {
      return (await source.countLinked()) > 0;
    }
    return true;
  },
});
