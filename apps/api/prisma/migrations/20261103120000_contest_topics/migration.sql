-- Contest topics drawn on the admin fortune wheel.
CREATE TABLE "ContestTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestTopic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContestTopic_title_key" ON "ContestTopic"("title");
