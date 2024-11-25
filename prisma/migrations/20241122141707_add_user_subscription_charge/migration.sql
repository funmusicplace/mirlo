-- CreateTable
CREATE TABLE "ArtistUserSubscriptionCharge" (
    "id" UUID NOT NULL,
    "artistUserSubscriptionId" INTEGER NOT NULL,
    "stripeId" TEXT NOT NULL,

    CONSTRAINT "ArtistUserSubscriptionCharge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ArtistUserSubscriptionCharge" ADD CONSTRAINT "ArtistUserSubscriptionCharge_artistUserSubscriptionId_fkey" FOREIGN KEY ("artistUserSubscriptionId") REFERENCES "ArtistUserSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
