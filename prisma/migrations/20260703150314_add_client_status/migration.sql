-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientBusinessInfo" (
    "clientEmail" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT,
    "industry" TEXT,
    "dealAmount" INTEGER,
    "signedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ClientBusinessInfo" ("clientEmail", "company", "dealAmount", "industry", "signedAt", "updatedAt") SELECT "clientEmail", "company", "dealAmount", "industry", "signedAt", "updatedAt" FROM "ClientBusinessInfo";
DROP TABLE "ClientBusinessInfo";
ALTER TABLE "new_ClientBusinessInfo" RENAME TO "ClientBusinessInfo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
