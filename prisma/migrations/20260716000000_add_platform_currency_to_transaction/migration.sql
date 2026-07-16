-- AlterTable
ALTER TABLE "UserTransaction" ADD COLUMN     "exchangeRate" DECIMAL(65,30),
ADD COLUMN     "platformCurrency" TEXT,
ADD COLUMN     "platformCurrencyAmount" INTEGER;
