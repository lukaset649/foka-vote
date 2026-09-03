-- CreateTable
CREATE TABLE "AliasReservation" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AliasReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AliasReservation_contestId_expiresAt_idx" ON "AliasReservation"("contestId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AliasReservation_contestId_alias_key" ON "AliasReservation"("contestId", "alias");

-- AddForeignKey
ALTER TABLE "AliasReservation" ADD CONSTRAINT "AliasReservation_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
