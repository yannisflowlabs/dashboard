-- CreateTable
CREATE TABLE "ManychatDmEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contactId" TEXT,
    "flowName" TEXT,
    "triggeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
