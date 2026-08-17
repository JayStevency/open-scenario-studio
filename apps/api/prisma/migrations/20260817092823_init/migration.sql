-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Membership" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    PRIMARY KEY ("projectId", "userId"),
    CONSTRAINT "Membership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptionList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT [],
    CONSTRAINT "OptionList_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Scenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Rule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rule_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rule_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CapabilityGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScenarioRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "condition" TEXT,
    "basisRuleId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ScenarioRelation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScenarioRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScenarioRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScenarioRelation_basisRuleId_fkey" FOREIGN KEY ("basisRuleId") REFERENCES "Rule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RuleLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "RuleLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CapabilityGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "devId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "CapabilityGroup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CapabilityGroup_devId_fkey" FOREIGN KEY ("devId") REFERENCES "DevScenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DevScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "prerequisiteDevIds" JSONB NOT NULL DEFAULT [],
    "acceptanceCriteria" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "DevScenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" BIGINT NOT NULL PRIMARY KEY,
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OptionList_projectId_kind_key" ON "OptionList"("projectId", "kind");

-- CreateIndex
CREATE INDEX "Scenario_projectId_idx" ON "Scenario"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_projectId_id_key" ON "Scenario"("projectId", "id");

-- CreateIndex
CREATE INDEX "Rule_projectId_scenarioId_idx" ON "Rule"("projectId", "scenarioId");

-- CreateIndex
CREATE INDEX "Rule_projectId_capabilityId_idx" ON "Rule"("projectId", "capabilityId");

-- CreateIndex
CREATE INDEX "ScenarioRelation_projectId_idx" ON "ScenarioRelation"("projectId");

-- CreateIndex
CREATE INDEX "RuleLink_projectId_idx" ON "RuleLink"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleLink_projectId_fromId_toId_kind_key" ON "RuleLink"("projectId", "fromId", "toId", "kind");

-- CreateIndex
CREATE INDEX "CapabilityGroup_projectId_devId_idx" ON "CapabilityGroup"("projectId", "devId");

-- CreateIndex
CREATE INDEX "DevScenario_projectId_idx" ON "DevScenario"("projectId");

-- CreateIndex
CREATE INDEX "ChangeLog_projectId_at_idx" ON "ChangeLog"("projectId", "at");

-- CreateIndex
CREATE INDEX "ChangeLog_projectId_entityType_entityId_idx" ON "ChangeLog"("projectId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChangeLog_projectId_actorType_at_idx" ON "ChangeLog"("projectId", "actorType", "at");
