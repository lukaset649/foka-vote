-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "rulesAcceptedAt" TIMESTAMP(3);

-- Backfill existing submissions predating the rules-acceptance checkbox
UPDATE "Submission" SET "rulesAcceptedAt" = "createdAt" WHERE "rulesAcceptedAt" IS NULL;

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "rulesAcceptedAt" SET NOT NULL;
