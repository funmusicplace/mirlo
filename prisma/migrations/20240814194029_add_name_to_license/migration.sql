/*
  Warnings:

  - Added the required column `name` to the `License` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "License" ADD COLUMN     "name" TEXT NOT NULL;
