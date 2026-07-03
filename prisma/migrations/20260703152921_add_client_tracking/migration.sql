-- CreateTable
CREATE TABLE "ClientCall" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientEmail" TEXT NOT NULL,
    "title" TEXT,
    "callDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordingUrl" TEXT,
    "transcriptUrl" TEXT,
    "transcriptText" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClientAction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientEmail" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "callId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ClientBusinessInfo" (
    "clientEmail" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT,
    "industry" TEXT,
    "dealAmount" INTEGER,
    "signedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ClientCall_clientEmail_idx" ON "ClientCall"("clientEmail");

-- CreateIndex
CREATE INDEX "ClientAction_clientEmail_idx" ON "ClientAction"("clientEmail");
