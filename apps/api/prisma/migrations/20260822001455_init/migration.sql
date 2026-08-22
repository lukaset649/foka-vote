-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'SUBMISSIONS', 'VOTING', 'CLOSED');

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "submissionStart" TIMESTAMP(3) NOT NULL,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "votingStart" TIMESTAMP(3) NOT NULL,
    "votingEnd" TIMESTAMP(3) NOT NULL,
    "maxArtworksPerSubmission" INTEGER NOT NULL DEFAULT 3,
    "accessCode" TEXT,
    "status" "ContestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "previewPath" TEXT NOT NULL,
    "thumbPath" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteCard" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteItem" (
    "id" TEXT NOT NULL,
    "voteCardId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "VoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alias" (
    "id" TEXT NOT NULL,
    "nick" TEXT NOT NULL,

    CONSTRAINT "Alias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contest_slug_key" ON "Contest"("slug");

-- CreateIndex
CREATE INDEX "Submission_contestId_lastName_firstName_idx" ON "Submission"("contestId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_contestId_alias_key" ON "Submission"("contestId", "alias");

-- CreateIndex
CREATE INDEX "Artwork_submissionId_sortOrder_idx" ON "Artwork"("submissionId", "sortOrder");

-- CreateIndex
CREATE INDEX "VoteCard_contestId_createdAt_idx" ON "VoteCard"("contestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoteItem_voteCardId_points_key" ON "VoteItem"("voteCardId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "VoteItem_voteCardId_submissionId_key" ON "VoteItem"("voteCardId", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Alias_nick_key" ON "Alias"("nick");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteCard" ADD CONSTRAINT "VoteCard_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteItem" ADD CONSTRAINT "VoteItem_voteCardId_fkey" FOREIGN KEY ("voteCardId") REFERENCES "VoteCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteItem" ADD CONSTRAINT "VoteItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
