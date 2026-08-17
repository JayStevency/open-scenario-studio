/**
 * FR-500 정합성 검사 8종.
 *
 * `integrity.ts` 와는 층위가 다르다. 저쪽은 "데이터가 깨졌는가"(없는 ID 참조 등)를 보고,
 * 여기는 "명세가 덜 여물었는가"를 본다. 깨지지 않았어도 지적될 수 있다.
 *
 * 데이터가 바뀌면 즉시 다시 계산한다 — 순수 함수로 두는 이유다.
 */
import type { ProjectData } from './types'

export type Severity = '경고' | '정보'

export interface Check {
  /** 요구사항 번호. 화면과 명세를 잇는다. */
  code: 'FR-501' | 'FR-502' | 'FR-503' | 'FR-504' | 'FR-505' | 'FR-506' | 'FR-507' | 'FR-508'
  label: string
  severity: Severity
  /** 지적된 대상. 화면은 앞 6건만 적고 나머지는 건수로 접는다. */
  targetIds: string[]
}

/** 담당 주체가 비었다고 볼 값. TSV 는 빈칸 대신 '미지정' 을 쓰기도 한다. */
function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '' || value.trim() === '미지정'
}

/** FR-505 는 예외 성격의 규칙이 있는지 본다. 유형 이름은 프로젝트마다 다르다. */
function isExceptionRule(ruleType: string): boolean {
  return ruleType.includes('예외')
}

/** FR-505 에서 "규칙이 많은 시나리오"로 보는 기준. */
const ENOUGH_RULES_TO_EXPECT_EXCEPTION = 4

/** FR-507 에서 공통 모듈 후보로 보는 기준. */
const SHARED_SCENARIO_THRESHOLD = 3

export function runChecks(data: ProjectData): Check[] {
  const scenarioOf = new Map(data.rules.map((r) => [r.id, r.scenarioId]))

  // FR-501 담당 주체 미지정
  const ownerMissing = data.rules.filter((r) => isBlank(r.owner)).map((r) => r.id)

  // FR-502 어떤 기능 그룹에도 속하지 않는 규칙
  const capMissing = data.rules.filter((r) => r.capabilityId === null).map((r) => r.id)

  // FR-503 발생 조건이 빈 시나리오 관계
  const conditionMissing = data.relations.filter((r) => isBlank(r.condition)).map((r) => r.id)

  // FR-504 근거 규칙이 지정되지 않은 시나리오 관계
  const basisMissing = data.relations.filter((r) => r.basisRuleId === null).map((r) => r.id)

  // FR-505 규칙이 충분히 많은데 예외 규칙이 하나도 없는 시나리오
  const rulesByScenario = new Map<string, typeof data.rules>()
  for (const rule of data.rules) {
    const list = rulesByScenario.get(rule.scenarioId) ?? []
    list.push(rule)
    rulesByScenario.set(rule.scenarioId, list)
  }
  const noExceptionRule = [...rulesByScenario.entries()]
    .filter(
      ([, rules]) =>
        rules.length >= ENOUGH_RULES_TO_EXPECT_EXCEPTION &&
        !rules.some((r) => isExceptionRule(r.ruleType)),
    )
    .map(([scenarioId]) => scenarioId)

  // FR-506 들어오거나 나가는 흐름 한쪽이 없는 시나리오
  const hasIncoming = new Set(data.relations.map((r) => r.toScenarioId))
  const hasOutgoing = new Set(data.relations.map((r) => r.fromScenarioId))
  const oneSidedFlow = data.scenarios
    .filter((s) => !hasIncoming.has(s.id) || !hasOutgoing.has(s.id))
    .map((s) => s.id)

  // FR-507 여러 시나리오에 걸친 기능 그룹 — 공통 모듈 후보
  const sharedCapabilities = data.capabilities
    .filter((cap) => {
      const scenarios = new Set(
        cap.ruleIds.map((id) => scenarioOf.get(id)).filter((v): v is string => v !== undefined),
      )
      return scenarios.size >= SHARED_SCENARIO_THRESHOLD
    })
    .map((c) => c.id)

  // FR-508 상태가 검토 필요인 규칙
  const needsReview = data.rules.filter((r) => r.status.trim() === '검토 필요').map((r) => r.id)

  return [
    { code: 'FR-501', label: '담당 주체 미지정', severity: '경고', targetIds: ownerMissing },
    { code: 'FR-502', label: '기능 그룹 미배정 규칙', severity: '경고', targetIds: capMissing },
    { code: 'FR-503', label: '조건 없는 관계', severity: '경고', targetIds: conditionMissing },
    { code: 'FR-504', label: '근거 규칙 없는 관계', severity: '경고', targetIds: basisMissing },
    {
      code: 'FR-505',
      label: `예외 규칙이 없는 시나리오 (규칙 ${ENOUGH_RULES_TO_EXPECT_EXCEPTION}건 이상)`,
      severity: '경고',
      targetIds: noExceptionRule,
    },
    {
      code: 'FR-506',
      label: '한쪽 흐름만 있는 시나리오',
      severity: '정보',
      targetIds: oneSidedFlow,
    },
    {
      code: 'FR-507',
      label: `공통 모듈 후보 (${SHARED_SCENARIO_THRESHOLD}개 이상 시나리오에 걸침)`,
      severity: '정보',
      targetIds: sharedCapabilities,
    },
    { code: 'FR-508', label: '검토 필요 상태', severity: '경고', targetIds: needsReview },
  ]
}

/** 헤더 뱃지에 쓰는 미해결 지적 건수(FR-003). 정보는 세지 않는다. */
export function warningCount(checks: Check[]): number {
  return checks.filter((c) => c.severity === '경고').reduce((sum, c) => sum + c.targetIds.length, 0)
}
