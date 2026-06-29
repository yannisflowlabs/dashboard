-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CallReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingId" INTEGER NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "calStatus" TEXT NOT NULL DEFAULT 'accepted',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CallReview" ("attendeeEmail", "attendeeName", "bookingId", "bookingUid", "createdAt", "id", "startTime", "status") SELECT "attendeeEmail", "attendeeName", "bookingId", "bookingUid", "createdAt", "id", "startTime", "status" FROM "CallReview";
DROP TABLE "CallReview";
ALTER TABLE "new_CallReview" RENAME TO "CallReview";
CREATE UNIQUE INDEX "CallReview_bookingId_key" ON "CallReview"("bookingId");
CREATE UNIQUE INDEX "CallReview_bookingUid_key" ON "CallReview"("bookingUid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
