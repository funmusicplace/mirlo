-- CreateEnum
CREATE TYPE "ContentFlagSource" AS ENUM ('USER_REPORT', 'SIGHTENGINE');

-- CreateTable
CREATE TABLE "ContentFlag" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ContentFlagSource" NOT NULL,
    "reason" TEXT,
    "description" TEXT,
    "reporterEmail" TEXT,
    "imageModel" TEXT,
    "imageId" TEXT,
    "score" DOUBLE PRECISION,
    "profileId" INTEGER,
    "trackGroupId" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" INTEGER,

    CONSTRAINT "ContentFlag_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContentFlag" ADD CONSTRAINT "ContentFlag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFlag" ADD CONSTRAINT "ContentFlag_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFlag" ADD CONSTRAINT "ContentFlag_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
