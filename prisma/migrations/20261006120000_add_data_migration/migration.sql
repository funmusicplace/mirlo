-- CreateTable
CREATE TABLE "DataMigration" (
    "name" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataMigration_pkey" PRIMARY KEY ("name")
);
