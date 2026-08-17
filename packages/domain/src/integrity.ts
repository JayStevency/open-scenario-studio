/**
 * 참조 무결성 검사 — REQUIREMENTS 4절 관계 규칙.
 * FR-500 정합성 검사(경고·정보)와는 별개로, 데이터가 깨졌는지를 본다.
 *
 * [잠정] 검사 목록은 요구사항이 정한 게 아니라 임의 판단으로 고른 것이다.
 *        무엇을 오류로 볼지는 논의해서 정할 몫이다. CLAUDE.md '잠정' 절 참고.
 */
import type { ProjectData } from './types'

export interface IntegrityViolation {
  code:
    | 'DUPLICATE_ID'
    | 'RULE_ORPHAN_SC'
    | 'RULE_UNKNOWN_CAP'
    | 'CAP_UNKNOWN_DEV'
    | 'CAP_UNKNOWN_RULE'
    | 'DEV_UNKNOWN_CAP'
    | 'REL_UNKNOWN_SC'
    | 'REL_UNKNOWN_RULE'
    | 'LINK_UNKNOWN_RULE'
    | 'LINK_SELF_REFERENCE'
    | 'LINK_DUPLICATE'
  id: string
  message: string
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const dup = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) dup.add(id)
    seen.add(id)
  }
  return [...dup]
}

export function checkIntegrity(data: ProjectData): IntegrityViolation[] {
  const violations: IntegrityViolation[] = []
  const add = (code: IntegrityViolation['code'], id: string, message: string) =>
    violations.push({ code, id, message })

  const scIds = new Set(data.scenarios.map((s) => s.id))
  const brIds = new Set(data.rules.map((r) => r.id))
  const capIds = new Set(data.capabilities.map((c) => c.id))
  const devIds = new Set(data.devScenarios.map((d) => d.id))

  for (const [label, ids] of [
    ['SC', data.scenarios.map((s) => s.id)],
    ['BR', data.rules.map((r) => r.id)],
    ['REL', data.relations.map((r) => r.id)],
    ['LINK', data.links.map((l) => l.id)],
    ['CAP', data.capabilities.map((c) => c.id)],
    ['DEV', data.devScenarios.map((d) => d.id)],
  ] as const) {
    for (const id of duplicates([...ids])) {
      add('DUPLICATE_ID', id, `${label} ID가 중복됐다: ${id}`)
    }
  }

  for (const rule of data.rules) {
    if (!scIds.has(rule.scenarioId)) {
      add('RULE_ORPHAN_SC', rule.id, `없는 시나리오를 가리킨다: ${rule.scenarioId}`)
    }
    if (rule.capabilityId !== null && !capIds.has(rule.capabilityId)) {
      add('RULE_UNKNOWN_CAP', rule.id, `없는 기능 그룹을 가리킨다: ${rule.capabilityId}`)
    }
  }

  for (const cap of data.capabilities) {
    if (!devIds.has(cap.devScenarioId)) {
      add('CAP_UNKNOWN_DEV', cap.id, `없는 개발 시나리오를 가리킨다: ${cap.devScenarioId}`)
    }
    for (const ruleId of cap.ruleIds) {
      if (!brIds.has(ruleId)) add('CAP_UNKNOWN_RULE', cap.id, `없는 규칙을 포함한다: ${ruleId}`)
    }
  }

  for (const dev of data.devScenarios) {
    for (const capId of dev.capabilityIds) {
      if (!capIds.has(capId)) add('DEV_UNKNOWN_CAP', dev.id, `없는 기능 그룹을 포함한다: ${capId}`)
    }
  }

  for (const rel of data.relations) {
    for (const scId of [rel.fromScenarioId, rel.toScenarioId]) {
      if (!scIds.has(scId)) add('REL_UNKNOWN_SC', rel.id, `없는 시나리오를 가리킨다: ${scId}`)
    }
    if (rel.basisRuleId !== null && !brIds.has(rel.basisRuleId)) {
      add('REL_UNKNOWN_RULE', rel.id, `없는 근거 규칙을 가리킨다: ${rel.basisRuleId}`)
    }
  }

  const linkKeys = new Set<string>()
  for (const link of data.links) {
    for (const ruleId of [link.fromRuleId, link.toRuleId]) {
      if (!brIds.has(ruleId)) add('LINK_UNKNOWN_RULE', link.id, `없는 규칙을 가리킨다: ${ruleId}`)
    }
    // FR-405 자기참조·중복 금지
    if (link.fromRuleId === link.toRuleId) {
      add('LINK_SELF_REFERENCE', link.id, '규칙이 자기 자신과 연결됐다')
    }
    const key = `${link.fromRuleId}→${link.toRuleId}:${link.kind}`
    if (linkKeys.has(key)) add('LINK_DUPLICATE', link.id, `같은 종류의 관계가 중복됐다: ${key}`)
    linkKeys.add(key)
  }

  return violations
}
