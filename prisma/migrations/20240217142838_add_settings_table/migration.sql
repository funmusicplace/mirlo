-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "settings" JSONB NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
