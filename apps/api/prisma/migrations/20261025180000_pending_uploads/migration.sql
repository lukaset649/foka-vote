-- Photos uploaded one by one before their submission is sent; claimed rows are deleted, abandoned ones expire.
CREATE TABLE "PendingUpload" (
    "id" TEXT NOT NULL,
    "albumId" TEXT,
    "contestId" TEXT,
    "filePath" TEXT NOT NULL,
    "previewPath" TEXT NOT NULL,
    "thumbPath" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingUpload_pkey" PRIMARY KEY ("id"),
    -- Prisma cannot express this; each upload belongs to exactly one album or contest.
    CONSTRAINT "PendingUpload_single_target_check" CHECK (("albumId" IS NULL) <> ("contestId" IS NULL))
);

CREATE INDEX "PendingUpload_createdAt_idx" ON "PendingUpload"("createdAt");

ALTER TABLE "PendingUpload" ADD CONSTRAINT "PendingUpload_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PendingUpload" ADD CONSTRAINT "PendingUpload_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
