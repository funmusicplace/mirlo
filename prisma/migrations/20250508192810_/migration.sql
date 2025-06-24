/*
  Warnings:

  - The required column `id` was added to the `UserAvatar` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "UserAvatar" ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("id");
