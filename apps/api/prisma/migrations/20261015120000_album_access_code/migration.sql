-- Albums are created by an admin, so they no longer carry a moderation status.
DROP INDEX "Album_status_hidden_createdAt_idx";
ALTER TABLE "Album" DROP COLUMN "status";

-- Uploading photos is gated per album, the same way a contest gates its own access.
ALTER TABLE "Album" ADD COLUMN "accessCode" TEXT;

CREATE INDEX "Album_hidden_createdAt_idx" ON "Album"("hidden", "createdAt");

-- The single global gallery access code is replaced by the per-album one.
DROP TABLE "Setting";
