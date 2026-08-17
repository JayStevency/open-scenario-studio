/*
  Warnings:

  - The primary key for the `CapabilityGroup` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `DevScenario` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Rule` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `RuleLink` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Scenario` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ScenarioRelation` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CapabilityGroup" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "devId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("projectId", "id"),
    CONSTRAINT "CapabilityGroup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CapabilityGroup_projectId_devId_fkey" FOREIGN KEY ("projectId", "devId") REFERENCES "DevScenario" ("projectId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CapabilityGroup" ("description", "devId", "id", "name", "projectId", "version") SELECT "description", "devId", "id", "name", "projectId", "version" FROM "CapabilityGroup";
DROP TABLE "CapabilityGroup";
ALTER TABLE "new_CapabilityGroup" RENAME TO "CapabilityGroup";
CREATE INDEX "CapabilityGroup_projectId_devId_idx" ON "CapabilityGroup"("projectId", "devId");
CREATE TABLE "new_DevScenario" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "prerequisiteDevIds" JSONB NOT NULL DEFAULT [],
    "acceptanceCriteria" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("projectId", "id"),
    CONSTRAINT "DevScenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DevScenario" ("acceptanceCriteria", "description", "id", "name", "owner", "prerequisiteDevIds", "projectId", "version") SELECT "acceptanceCriteria", "description", "id", "name", "owner", "prerequisiteDevIds", "projectId", "version" FROM "DevScenario";
DROP TABLE "DevScenario";
ALTER TABLE "new_DevScenario" RENAME TO "DevScenario";
CREATE INDEX "DevScenario_projectId_idx" ON "DevScenario"("projectId");
CREATE TABLE "new_Rule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "owner" TEXT,
    "capabilityId" TEXT,
    "status" TEXT NOT NULL,
    "openIssue" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("projectId", "id"),
    CONSTRAINT "Rule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rule_projectId_scenarioId_fkey" FOREIGN KEY ("projectId", "scenarioId") REFERENCES "Scenario" ("projectId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rule_projectId_capabilityId_fkey" FOREIGN KEY ("projectId", "capabilityId") REFERENCES "CapabilityGroup" ("projectId", "id") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_Rule" ("capabilityId", "id", "openIssue", "orderIndex", "owner", "projectId", "ruleType", "scenarioId", "statement", "status", "version") SELECT "capabilityId", "id", "openIssue", "orderIndex", "owner", "projectId", "ruleType", "scenarioId", "statement", "status", "version" FROM "Rule";
DROP TABLE "Rule";
ALTER TABLE "new_Rule" RENAME TO "Rule";
CREATE INDEX "Rule_projectId_scenarioId_idx" ON "Rule"("projectId", "scenarioId");
CREATE INDEX "Rule_projectId_capabilityId_idx" ON "Rule"("projectId", "capabilityId");
CREATE TABLE "new_RuleLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("projectId", "id"),
    CONSTRAINT "RuleLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleLink_projectId_fromId_fkey" FOREIGN KEY ("projectId", "fromId") REFERENCES "Rule" ("projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleLink_projectId_toId_fkey" FOREIGN KEY ("projectId", "toId") REFERENCES "Rule" ("projectId", "id") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_RuleLink" ("fromId", "id", "kind", "note", "projectId", "toId", "version") SELECT "fromId", "id", "kind", "note", "projectId", "toId", "version" FROM "RuleLink";
DROP TABLE "RuleLink";
ALTER TABLE "new_RuleLink" RENAME TO "RuleLink";
CREATE INDEX "RuleLink_projectId_idx" ON "RuleLink"("projectId");
CREATE UNIQUE INDEX "RuleLink_projectId_fromId_toId_kind_key" ON "RuleLink"("projectId", "fromId", "toId", "kind");
CREATE TABLE "new_Scenario" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "trigger" TEXT,
    "endCondition" TEXT,
    "lifecycle" TEXT,
    "x" REAL,
    "y" REAL,
    "version" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("projectId", "id"),
    CONSTRAINT "Scenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Scenario" ("area", "displayName", "endCondition", "id", "lifecycle", "name", "projectId", "trigger", "version", "x", "y") SELECT "area", "displayName", "endCondition", "id", "lifecycle", "name", "projectId", "trigger", "version", "x", "y" FROM "Scenario";
DROP TABLE "Scenario";
ALTER TABLE "new_Scenario" RENAME TO "Scenario";
CREATE TABLE "new_ScenarioRelation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "condition" TEXT,
    "basisRuleId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("projectId", "id"),
    CONSTRAINT "ScenarioRelation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScenarioRelation_projectId_fromId_fkey" FOREIGN KEY ("projectId", "fromId") REFERENCES "Scenario" ("projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScenarioRelation_projectId_toId_fkey" FOREIGN KEY ("projectId", "toId") REFERENCES "Scenario" ("projectId", "id") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "ScenarioRelation_projectId_basisRuleId_fkey" FOREIGN KEY ("projectId", "basisRuleId") REFERENCES "Rule" ("projectId", "id") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_ScenarioRelation" ("basisRuleId", "condition", "fromId", "id", "kind", "projectId", "toId", "version") SELECT "basisRuleId", "condition", "fromId", "id", "kind", "projectId", "toId", "version" FROM "ScenarioRelation";
DROP TABLE "ScenarioRelation";
ALTER TABLE "new_ScenarioRelation" RENAME TO "ScenarioRelation";
CREATE INDEX "ScenarioRelation_projectId_idx" ON "ScenarioRelation"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
