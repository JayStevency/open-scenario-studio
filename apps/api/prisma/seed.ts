import { checkIntegrity, parseProjectData } from '@oss/domain'
import { hasDesignData, readDesignData } from '@oss/domain/designData'
import { prisma } from '../src/prisma'

const PROJECT_ID = process.env.SEED_PROJECT_ID ?? 'proj-robotaxi'

if (!hasDesignData()) {
  console.error(
    'design/data/ 에 TSV 여섯 개가 없다. 저장소에 올리지 않는 파일이라 직접 넣어야 한다.',
  )
  process.exit(1)
}

const data = parseProjectData(readDesignData())

const violations = checkIntegrity(data)
if (violations.length > 0) {
  console.error('참조 무결성 위반이 있어 적재를 멈춘다:')
  for (const v of violations) console.error(`  [${v.code}] ${v.id} — ${v.message}`)
  process.exit(1)
}

await prisma.project.upsert({
  where: { id: PROJECT_ID },
  update: {},
  create: { id: PROJECT_ID, name: '로보택시' },
})

// 외래키 순서: DEV → CAP → SC → BR → REL → LINK
for (const dev of data.devScenarios) {
  await prisma.devScenario.upsert({
    where: { id: dev.id },
    update: { name: dev.name, description: dev.description, owner: dev.owner },
    create: {
      id: dev.id,
      projectId: PROJECT_ID,
      name: dev.name,
      description: dev.description,
      owner: dev.owner,
    },
  })
}

for (const cap of data.capabilities) {
  await prisma.capabilityGroup.upsert({
    where: { id: cap.id },
    update: { name: cap.name, description: cap.description, devId: cap.devScenarioId },
    create: {
      id: cap.id,
      projectId: PROJECT_ID,
      devId: cap.devScenarioId,
      name: cap.name,
      description: cap.description,
    },
  })
}

for (const sc of data.scenarios) {
  await prisma.scenario.upsert({
    where: { id: sc.id },
    update: { name: sc.name, displayName: sc.displayName, area: sc.area },
    create: {
      id: sc.id,
      projectId: PROJECT_ID,
      name: sc.name,
      displayName: sc.displayName,
      area: sc.area,
    },
  })
}

for (const [index, rule] of data.rules.entries()) {
  await prisma.rule.upsert({
    where: { id: rule.id },
    update: {
      scenarioId: rule.scenarioId,
      statement: rule.statement,
      ruleType: rule.ruleType,
      owner: rule.owner,
      capabilityId: rule.capabilityId,
      status: rule.status,
      orderIndex: index,
    },
    create: {
      id: rule.id,
      projectId: PROJECT_ID,
      scenarioId: rule.scenarioId,
      statement: rule.statement,
      ruleType: rule.ruleType,
      owner: rule.owner,
      capabilityId: rule.capabilityId,
      status: rule.status,
      orderIndex: index,
    },
  })
}

for (const rel of data.relations) {
  await prisma.scenarioRelation.upsert({
    where: { id: rel.id },
    update: {
      fromId: rel.fromScenarioId,
      toId: rel.toScenarioId,
      kind: rel.kind,
      condition: rel.condition,
      basisRuleId: rel.basisRuleId,
    },
    create: {
      id: rel.id,
      projectId: PROJECT_ID,
      fromId: rel.fromScenarioId,
      toId: rel.toScenarioId,
      kind: rel.kind,
      condition: rel.condition,
      basisRuleId: rel.basisRuleId,
    },
  })
}

for (const link of data.links) {
  await prisma.ruleLink.upsert({
    where: { id: link.id },
    update: { fromId: link.fromRuleId, toId: link.toRuleId, kind: link.kind, note: link.note },
    create: {
      id: link.id,
      projectId: PROJECT_ID,
      fromId: link.fromRuleId,
      toId: link.toRuleId,
      kind: link.kind,
      note: link.note,
    },
  })
}

console.log(
  `적재 완료 — SC ${data.scenarios.length} · BR ${data.rules.length} · REL ${data.relations.length} · CAP ${data.capabilities.length} · DEV ${data.devScenarios.length} · LINK ${data.links.length}`,
)

await prisma.$disconnect()
