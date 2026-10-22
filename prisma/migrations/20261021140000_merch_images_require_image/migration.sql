-- Rows still without an Image are either unmigrated (the instance skipped the
-- release that ran the backfill) or ones the backfill left behind because
-- their files were gone.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "MerchImage" WHERE "imageId" IS NULL) THEN
    IF NOT EXISTS (
      SELECT 1 FROM "DataMigration"
      WHERE "name" = '2026-10-merch-images-to-central-images'
    ) THEN
      RAISE EXCEPTION 'Merch images have not been moved to the Image table yet. Upgrade to the previous Mirlo release first and let its background worker finish the 2026-10-merch-images-to-central-images data migration.';
    END IF;
    DELETE FROM "MerchImage" WHERE "imageId" IS NULL;
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "MerchImage" DROP CONSTRAINT "MerchImage_imageId_fkey";

-- AlterTable
ALTER TABLE "MerchImage" DROP COLUMN "url",
ALTER COLUMN "imageId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "MerchImage" ADD CONSTRAINT "MerchImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
