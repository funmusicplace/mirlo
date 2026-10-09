-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "profileId" INTEGER;

-- CreateIndex
CREATE INDEX "Image_profileId_idx" ON "Image"("profileId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fill owners from existing links
UPDATE "Image" AS i
SET "profileId" = m."profileId"
FROM "MerchImage" AS mi
JOIN "Merch" AS m ON m."id" = mi."merchId"
WHERE mi."imageId" = i."id";

UPDATE "Image" AS i
SET "profileId" = t."profileId"
FROM "SubscriptionTierImage" AS sti
JOIN "ProfileSubscriptionTier" AS t ON t."id" = sti."tierId"
WHERE sti."imageId" = i."id" AND i."profileId" IS NULL;
