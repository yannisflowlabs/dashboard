-- CreateTable
CREATE TABLE "GoogleToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ManualMetric" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ManualMetric" ("key", "updatedAt", "value") SELECT "key", "updatedAt", "value" FROM "ManualMetric";
DROP TABLE "ManualMetric";
ALTER TABLE "new_ManualMetric" RENAME TO "ManualMetric";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
