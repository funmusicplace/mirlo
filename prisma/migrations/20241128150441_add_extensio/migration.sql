/*
  Warnings:

  - Added the required column `extension` to the `PostImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PostImage" ADD COLUMN     "extension" TEXT NOT NULL;
