import type { DataMigration } from "..";
import logger from "../../logger";
import { fixStoredImageContentTypes } from "../../utils/minio";

const imageContentTypes: DataMigration = {
  name: "2026-10-image-content-types",
  run: async () => {
    const { checked, fixed, failed } = await fixStoredImageContentTypes();
    logger.info(
      `dataMigrations: checked ${checked} images, fixed ${fixed} content types, ${failed} failed`
    );
    return failed === 0;
  },
};

export default imageContentTypes;
