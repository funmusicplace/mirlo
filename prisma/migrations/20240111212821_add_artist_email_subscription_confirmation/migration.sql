-- CreateTable
CREATE TABLE "ArtistUserSubscriptionConfirmation" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "artistId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "tokenExpiration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistUserSubscriptionConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistUserSubscriptionConfirmation_email_artistId_key" ON "ArtistUserSubscriptionConfirmation"("email", "artistId");
