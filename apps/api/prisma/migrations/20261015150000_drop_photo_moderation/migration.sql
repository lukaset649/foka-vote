-- Uploading is gated by the album access code, so photos no longer wait for approval.
DROP INDEX "AlbumPhoto_albumId_status_createdAt_idx";
ALTER TABLE "AlbumPhoto" DROP COLUMN "status";

CREATE INDEX "AlbumPhoto_albumId_createdAt_idx" ON "AlbumPhoto"("albumId", "createdAt");

DROP TYPE "ModerationStatus";
