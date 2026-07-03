-- AlterTable
ALTER TABLE "ClientBusinessInfo" ADD COLUMN "sessionsTotal" INTEGER;
ALTER TABLE "ClientBusinessInfo" ADD COLUMN "sessionsDone" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClientBusinessInfo" ADD COLUMN "contextNote" TEXT;
