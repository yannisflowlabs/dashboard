-- CreateTable
CREATE TABLE "CallReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingId" INTEGER NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CallReview_bookingId_key" ON "CallReview"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "CallReview_bookingUid_key" ON "CallReview"("bookingUid");
