/*
  Warnings:

  - The primary key for the `Audio` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `Audio` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Audio" DROP CONSTRAINT "Audio_pkey",
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "hash" TEXT,
ADD COLUMN     "originalFilename" TEXT,
ADD COLUMN     "size" INTEGER,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Audio_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "originalFilename" TEXT;
