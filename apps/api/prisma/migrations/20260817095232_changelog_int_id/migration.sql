/*
  Warnings:

  - The primary key for the `ChangeLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `ChangeLog` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChangeLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "actorLabel" TEXT,
    "authorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "note" TEXT,
    CONSTRAINT "ChangeLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChangeLog" ("action", "actorLabel", "actorType", "after", "at", "authorId", "before", "entityId", "entityType", "id", "note", "projectId") SELECT "action", "actorLabel", "actorType", "after", "at", "authorId", "before", "entityId", "entityType", "id", "note", "projectId" FROM "ChangeLog";
DROP TABLE "ChangeLog";
ALTER TABLE "new_ChangeLog" RENAME TO "ChangeLog";
CREATE INDEX "ChangeLog_projectId_at_idx" ON "ChangeLog"("projectId", "at");
CREATE INDEX "ChangeLog_projectId_entityType_entityId_idx" ON "ChangeLog"("projectId", "entityType", "entityId");
CREATE INDEX "ChangeLog_projectId_actorType_at_idx" ON "ChangeLog"("projectId", "actorType", "at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
