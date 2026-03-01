-- AlterTable: Add window fields for FEREASTRA schedule type
-- startWindowEnd: latest allowed clock-in time (e.g. "10:00")
-- endWindowStart: earliest allowed clock-out time (e.g. "16:00")
ALTER TABLE "Schedule" ADD COLUMN "startWindowEnd" TEXT;
ALTER TABLE "Schedule" ADD COLUMN "endWindowStart" TEXT;
