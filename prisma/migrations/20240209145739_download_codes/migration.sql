-- CreateTable
CREATE TABLE "TrackGroupDownloadCodes" (
    "id" UUID NOT NULL,
    "trackGroupId" INTEGER NOT NULL,
    "downloadCode" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "redeemedByUserId" INTEGER,

    CONSTRAINT "TrackGroupDownloadCodes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrackGroupDownloadCodes" ADD CONSTRAINT "TrackGroupDownloadCodes_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackGroupDownloadCodes" ADD CONSTRAINT "TrackGroupDownloadCodes_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
