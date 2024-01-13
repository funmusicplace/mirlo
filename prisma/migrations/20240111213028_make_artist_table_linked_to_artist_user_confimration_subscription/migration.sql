-- AddForeignKey
ALTER TABLE "ArtistUserSubscriptionConfirmation" ADD CONSTRAINT "ArtistUserSubscriptionConfirmation_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
