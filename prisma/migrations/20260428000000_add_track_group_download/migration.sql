CREATE TABLE "TrackGroupDownload" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trackGroupId" INTEGER NOT NULL,
  "userId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrackGroupDownload_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TrackGroupDownload" ADD CONSTRAINT "TrackGroupDownload_trackGroupId_fkey"
  FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrackGroupDownload" ADD CONSTRAINT "TrackGroupDownload_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
