-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "federatedStreamingOptInDate" TIMESTAMP(3),
ADD COLUMN     "federatedStreamingOptOutDate" TIMESTAMP(3);
