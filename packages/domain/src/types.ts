/**
 * design/REQUIREMENTS.md 4절 데이터 모델.
 * 필드명은 코드에서 영문, 화면 표기는 한국어(NFR-05)를 따른다.
 */

export type ScenarioId = string // SC-0, SC-2a
export type RuleId = string // SC-0.1
export type RelationId = string // REL-001
export type LinkId = string // L-1
export type CapabilityId = string // CAP-01
export type DevScenarioId = string // DEV-A

/** SC — 시나리오 */
export interface Scenario {
  id: ScenarioId
  name: string
  displayName: string
  area: string
  trigger?: string
  endCondition?: string
  lifecycleStage?: string
  x?: number
  y?: number
}

/** BR — 동작 규칙. 정확히 하나의 SC에 속하고, 최대 하나의 CAP에 속한다. */
export interface Rule {
  id: RuleId
  scenarioId: ScenarioId
  statement: string
  ruleType: string
  owner: string
  capabilityId: CapabilityId | null
  status: string
  openIssue?: string
}

/** REL — 시나리오 간 관계 */
export type RelationKind = '전환' | '분기' | '재실행' | '준용'

export interface ScenarioRelation {
  id: RelationId
  fromScenarioId: ScenarioId
  toScenarioId: ScenarioId
  kind: RelationKind | string
  condition: string
  basisRuleId: RuleId | null
}

/** LINK — BR 간 관계 (FR-403) */
export type LinkKind = '선행' | '예외' | '대체' | '데이터 의존'

export interface RuleLink {
  id: LinkId
  fromRuleId: RuleId
  toRuleId: RuleId
  kind: LinkKind | string
  note: string
}

/** CAP — 기능 그룹. 정확히 하나의 DEV에 속한다. */
export interface CapabilityGroup {
  id: CapabilityId
  devScenarioId: DevScenarioId
  name: string
  description: string
  ruleIds: RuleId[]
}

/** DEV — 개발 시나리오 */
export interface DevScenario {
  id: DevScenarioId
  name: string
  description: string
  owner: string
  capabilityIds: CapabilityId[]
  prerequisiteDevIds?: DevScenarioId[]
  acceptanceCriteria?: string
}

/** 앱이 다루는 프로젝트 데이터 한 벌 */
export interface ProjectData {
  scenarios: Scenario[]
  rules: Rule[]
  relations: ScenarioRelation[]
  links: RuleLink[]
  capabilities: CapabilityGroup[]
  devScenarios: DevScenario[]
}

export const UNASSIGNED_OWNER = '미지정'
