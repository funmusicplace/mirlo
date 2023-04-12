-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "applicationName" TEXT NOT NULL,
    "applicationUrl" TEXT NOT NULL,
    "allowedCorsOrigins" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);
