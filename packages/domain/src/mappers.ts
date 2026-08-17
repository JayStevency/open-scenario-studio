/**
 * design/data/*.tsv 원문 → ProjectData.
 * 웹은 `?raw` import 로, 서버는 fs 로 문자열을 읽어 같은 함수에 넣는다.
 */
import { orNull, parseIdList, parseTsv } from './tsv'
import type {
  CapabilityGroup,
  DevScenario,
  ProjectData,
  Rule,
  RuleLink,
  Scenario,
  ScenarioRelation,
} from './types'

/** TSV 파일 여섯 종의 원문. 키는 design/data 의 파일 성격과 1:1. */
export interface TsvSources {
  scenarios: string
  rules: string
  relations: string
  capabilities: string
  devScenarios: string
  links: string
}

/** design/data 안의 파일명. 서버·스크립트가 경로를 만들 때 쓴다. */
export const TSV_FILENAMES: Record<keyof TsvSources, string> = {
  scenarios: '01_SC_scenarios.tsv',
  rules: '02_BR_rules.tsv',
  relations: '03_REL_scenario_relations.tsv',
  capabilities: '04_CAP_capability_groups.tsv',
  devScenarios: '05_DEV_dev_scenarios.tsv',
  links: '06_LINK_br_relations.tsv',
}

function cell(row: Record<string, string>, key: string): string {
  return row[key] ?? ''
}

export function parseProjectData(sources: TsvSources): ProjectData {
  const scenarios: Scenario[] = parseTsv(sources.scenarios).map((r) => ({
    id: cell(r, 'SC ID'),
    name: cell(r, '명칭'),
    displayName: cell(r, '표시명'),
    area: cell(r, '영역'),
  }))

  const rules: Rule[] = parseTsv(sources.rules).map((r) => ({
    id: cell(r, 'BR ID'),
    scenarioId: cell(r, 'SC ID'),
    statement: cell(r, '규칙 문장'),
    ruleType: cell(r, '유형'),
    owner: cell(r, '담당 주체'),
    capabilityId: orNull(cell(r, 'CAP ID')),
    status: cell(r, '상태'),
  }))

  const relations: ScenarioRelation[] = parseTsv(sources.relations).map((r) => ({
    id: cell(r, 'REL ID'),
    fromScenarioId: cell(r, '출발 SC'),
    toScenarioId: cell(r, '도착 SC'),
    kind: cell(r, '관계 종류'),
    condition: cell(r, '발생 조건'),
    basisRuleId: orNull(cell(r, '근거 규칙 ID')),
  }))

  const capabilities: CapabilityGroup[] = parseTsv(sources.capabilities).map((r) => ({
    id: cell(r, 'CAP ID'),
    devScenarioId: cell(r, 'DEV ID'),
    name: cell(r, '명칭'),
    description: cell(r, '설명'),
    ruleIds: parseIdList(cell(r, '포함 BR ID')),
  }))

  const devScenarios: DevScenario[] = parseTsv(sources.devScenarios).map((r) => ({
    id: cell(r, 'DEV ID'),
    name: cell(r, '명칭'),
    description: cell(r, '설명'),
    owner: cell(r, '담당'),
    capabilityIds: parseIdList(cell(r, '포함 CAP')),
  }))

  const links: RuleLink[] = parseTsv(sources.links).map((r) => ({
    id: cell(r, 'LINK ID'),
    fromRuleId: cell(r, '기준 BR'),
    toRuleId: cell(r, '연결 BR'),
    kind: cell(r, '관계 종류'),
    note: cell(r, '비고'),
  }))

  return { scenarios, rules, relations, links, capabilities, devScenarios }
}
