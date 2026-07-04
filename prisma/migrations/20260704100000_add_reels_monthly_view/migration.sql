CREATE TABLE "ReelsMonthlyView" (
    "month"     TEXT NOT NULL PRIMARY KEY,
    "views"     INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
