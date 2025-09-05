-- CreateTable
CREATE TABLE "DownloadableContent" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "originalFilename" TEXT,
    "fileExtension" TEXT,
    "uploadState" "UploadState" NOT NULL DEFAULT 'STARTED',
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownloadableContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackGroupDownloadableContent" (
    "trackGroupId" INTEGER NOT NULL,
    "downloadableContentId" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "MerchDownloadableContent" (
    "merchId" UUID NOT NULL,
    "downloadableContentId" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DownloadableContent_url_key" ON "DownloadableContent"("url");

-- CreateIndex
CREATE UNIQUE INDEX "TrackGroupDownloadableContent_trackGroupId_downloadableCont_key" ON "TrackGroupDownloadableContent"("trackGroupId", "downloadableContentId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchDownloadableContent_merchId_downloadableContentId_key" ON "MerchDownloadableContent"("merchId", "downloadableContentId");

-- AddForeignKey
ALTER TABLE "TrackGroupDownloadableContent" ADD CONSTRAINT "TrackGroupDownloadableContent_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackGroupDownloadableContent" ADD CONSTRAINT "TrackGroupDownloadableContent_downloadableContentId_fkey" FOREIGN KEY ("downloadableContentId") REFERENCES "DownloadableContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchDownloadableContent" ADD CONSTRAINT "MerchDownloadableContent_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchDownloadableContent" ADD CONSTRAINT "MerchDownloadableContent_downloadableContentId_fkey" FOREIGN KEY ("downloadableContentId") REFERENCES "DownloadableContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
