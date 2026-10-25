-- One album upload becomes one AlbumSubmission, like a contest Submission groups its Artworks.
CREATE TABLE "AlbumSubmission" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "rulesAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlbumSubmission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AlbumPhoto" ADD COLUMN "submissionId" TEXT;
ALTER TABLE "AlbumPhoto" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Photos from one upload share the author and the exact rulesAcceptedAt timestamp.
INSERT INTO "AlbumSubmission" ("id", "albumId", "firstName", "lastName", "rulesAcceptedAt", "createdAt")
SELECT gen_random_uuid()::text, "albumId", "firstName", "lastName", "rulesAcceptedAt", MIN("createdAt")
FROM "AlbumPhoto"
GROUP BY "albumId", "firstName", "lastName", "rulesAcceptedAt";

UPDATE "AlbumPhoto" AS p
SET "submissionId" = s."id"
FROM "AlbumSubmission" AS s
WHERE s."albumId" = p."albumId"
  AND s."firstName" = p."firstName"
  AND s."lastName" = p."lastName"
  AND s."rulesAcceptedAt" = p."rulesAcceptedAt";

UPDATE "AlbumPhoto" AS p
SET "sortOrder" = ordered."position"
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "submissionId" ORDER BY "createdAt", "id") - 1 AS "position"
    FROM "AlbumPhoto"
) AS ordered
WHERE ordered."id" = p."id";

ALTER TABLE "AlbumPhoto" ALTER COLUMN "submissionId" SET NOT NULL;

ALTER TABLE "AlbumPhoto" DROP CONSTRAINT "AlbumPhoto_albumId_fkey";
DROP INDEX "AlbumPhoto_albumId_createdAt_idx";
ALTER TABLE "AlbumPhoto" DROP COLUMN "albumId",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "rulesAcceptedAt";

CREATE INDEX "AlbumSubmission_albumId_createdAt_idx" ON "AlbumSubmission"("albumId", "createdAt");
CREATE INDEX "AlbumPhoto_submissionId_sortOrder_idx" ON "AlbumPhoto"("submissionId", "sortOrder");

ALTER TABLE "AlbumSubmission" ADD CONSTRAINT "AlbumSubmission_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AlbumSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
