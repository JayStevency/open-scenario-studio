/**
 * design/data/*.tsv 를 빌드 시점에 읽어 ProjectData 로 바꾼다.
 * 서버 저장이 붙기 전까지의 시드 데이터원이다(REQUIREMENTS 7절).
 */
import scenariosTsv from '../../design/data/01_SC_scenarios.tsv?raw'
import rulesTsv from '../../design/data/02_BR_rules.tsv?raw'
import relationsTsv from '../../design/data/03_REL_scenario_relations.tsv?raw'
import capabilitiesTsv from '../../design/data/04_CAP_capability_groups.tsv?raw'
import devScenariosTsv from '../../design/data/05_DEV_dev_scenarios.tsv?raw'
import linksTsv from '../../design/data/06_LINK_br_relations.tsv?raw'

import { orNull, parseIdList, parseTsv } from './tsv'
import type {
  CapabilityGroup,
  DevScenario,
  ProjectData,
  Rule,
  RuleLink,
  Scenario,
  ScenarioRelation,
} from '../domain/types'

function cell(row: Record<string, string>, key: string): string {
  return row[key] ?? ''
}

export function loadSeedData(): ProjectData {
  const scenarios: Scenario[] = parseTsv(scenariosTsv).map((r) => ({
    id: cell(r, 'SC ID'),
    name: cell(r, '명칭'),
    displayName: cell(r, '표시명'),
    area: cell(r, '영역'),
  }))

  const rules: Rule[] = parseTsv(rulesTsv).map((r) => ({
    id: cell(r, 'BR ID'),
    scenarioId: cell(r, 'SC ID'),
    statement: cell(r, '규칙 문장'),
    ruleType: cell(r, '유형'),
    owner: cell(r, '담당 주체'),
    capabilityId: orNull(cell(r, 'CAP ID')),
    status: cell(r, '상태'),
  }))

  const relations: ScenarioRelation[] = parseTsv(relationsTsv).map((r) => ({
    id: cell(r, 'REL ID'),
    fromScenarioId: cell(r, '출발 SC'),
    toScenarioId: cell(r, '도착 SC'),
    kind: cell(r, '관계 종류'),
    condition: cell(r, '발생 조건'),
    basisRuleId: orNull(cell(r, '근거 규칙 ID')),
  }))

  const capabilities: CapabilityGroup[] = parseTsv(capabilitiesTsv).map((r) => ({
    id: cell(r, 'CAP ID'),
    devScenarioId: cell(r, 'DEV ID'),
    name: cell(r, '명칭'),
    description: cell(r, '설명'),
    ruleIds: parseIdList(cell(r, '포함 BR ID')),
  }))

  const devScenarios: DevScenario[] = parseTsv(devScenariosTsv).map((r) => ({
    id: cell(r, 'DEV ID'),
    name: cell(r, '명칭'),
    description: cell(r, '설명'),
    owner: cell(r, '담당'),
    capabilityIds: parseIdList(cell(r, '포함 CAP')),
  }))

  const links: RuleLink[] = parseTsv(linksTsv).map((r) => ({
    id: cell(r, 'LINK ID'),
    fromRuleId: cell(r, '기준 BR'),
    toRuleId: cell(r, '연결 BR'),
    kind: cell(r, '관계 종류'),
    note: cell(r, '비고'),
  }))

  return { scenarios, rules, relations, links, capabilities, devScenarios }
}
