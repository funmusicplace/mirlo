-- AlterEnum
ALTER TYPE "FundraiserStatus" ADD VALUE 'DRAFT';
ALTER TYPE "FundraiserStatus" ADD VALUE 'FUNDING';
ALTER TYPE "FundraiserStatus" ADD VALUE 'COMPLETE';
ALTER TYPE "FundraiserStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "FundraiserStatus" ADD VALUE 'SUSPENDED';

-- Update existing data
UPDATE "Fundraiser" SET "status" = 'FUNDING' WHERE "status" = 'ACTIVE';
UPDATE "Fundraiser" SET "status" = 'COMPLETE' WHERE "status" = 'SUCCESSFUL';

-- AlterTable
ALTER TABLE "Fundraiser" RENAME COLUMN "status" TO "fundraiserStatus";
ALTER TABLE "Fundraiser" ALTER COLUMN "fundraiserStatus" SET DEFAULT 'FUNDING';

-- Drop old enum values (requires dropping and recreating the enum)
-- Create temp column
ALTER TABLE "Fundraiser" ADD COLUMN "status_temp" TEXT;
UPDATE "Fundraiser" SET "status_temp" = "fundraiserStatus"::TEXT;

-- Drop the old column
ALTER TABLE "Fundraiser" DROP COLUMN "fundraiserStatus";

-- Drop and recreate enum
DROP TYPE "FundraiserStatus";
CREATE TYPE "FundraiserStatus" AS ENUM ('DRAFT', 'FUNDING', 'COMPLETE', 'FAILED', 'CANCELLED', 'SUSPENDED');

-- Recreate column with new enum
ALTER TABLE "Fundraiser" ADD COLUMN "fundraiserStatus" "FundraiserStatus" NOT NULL DEFAULT 'FUNDING';
UPDATE "Fundraiser" SET "fundraiserStatus" = "status_temp"::"FundraiserStatus";

-- Drop temp column
ALTER TABLE "Fundraiser" DROP COLUMN "status_temp";
