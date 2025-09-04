-- CreateTable
CREATE TABLE "TrackGroupPledge" (
    "id" SERIAL NOT NULL,
    "trackGroupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeSetupIntent" TEXT NOT NULL,

    CONSTRAINT "TrackGroupPledge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrackGroupPledge" ADD CONSTRAINT "TrackGroupPledge_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackGroupPledge" ADD CONSTRAINT "TrackGroupPledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
