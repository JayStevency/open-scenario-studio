import { describe, expect, it } from 'vitest'
import { type Check, runChecks, warningCount } from './checks'
import type { ProjectData } from './types'

function rule(id: string, over: Partial<ProjectData['rules'][number]> = {}) {
  return {
    id,
    scenarioId: 'SC-1',
    statement: '문장',
    ruleType: '상태',
    owner: '서버',
    capabilityId: 'CAP-01',
    status: '확정',
    ...over,
  }
}

function data(over: Partial<ProjectData> = {}): ProjectData {
  return {
    scenarios: [],
    rules: [],
    relations: [],
    links: [],
    capabilities: [],
    devScenarios: [],
    ...over,
  }
}

function find(checks: Check[], code: Check['code']) {
  const found = checks.find((c) => c.code === code)
  if (found === undefined) throw new Error(`${code} 가 결과에 없다`)
  return found
}

describe('FR-501 담당 주체 미지정', () => {
  it("빈 값과 '미지정' 을 모두 잡는다", () => {
    const checks = runChecks(
      data({
        rules: [
          rule('a', { owner: '서버' }),
          rule('b', { owner: '' }),
          rule('c', { owner: '미지정' }),
        ],
      }),
    )
    expect(find(checks, 'FR-501').targetIds).toEqual(['b', 'c'])
  })
})

describe('FR-502 기능 그룹 미배정', () => {
  it('CAP 이 없는 규칙을 잡는다', () => {
    const checks = runChecks(data({ rules: [rule('a'), rule('b', { capabilityId: null })] }))
    expect(find(checks, 'FR-502').targetIds).toEqual(['b'])
  })
})

describe('FR-503 · FR-504 관계의 빈 값', () => {
  it('조건과 근거 규칙을 따로 센다', () => {
    const checks = runChecks(
      data({
        relations: [
          {
            id: 'R1',
            fromScenarioId: 'SC-1',
            toScenarioId: 'SC-2',
            kind: '전환',
            condition: '조건',
            basisRuleId: 'a',
          },
          {
            id: 'R2',
            fromScenarioId: 'SC-1',
            toScenarioId: 'SC-2',
            kind: '전환',
            condition: '',
            basisRuleId: 'a',
          },
          {
            id: 'R3',
            fromScenarioId: 'SC-1',
            toScenarioId: 'SC-2',
            kind: '전환',
            condition: '조건',
            basisRuleId: null,
          },
        ],
      }),
    )
    expect(find(checks, 'FR-503').targetIds).toEqual(['R2'])
    expect(find(checks, 'FR-504').targetIds).toEqual(['R3'])
  })
})

describe('FR-505 예외 규칙이 없는 시나리오', () => {
  it('규칙 4건 이상이고 예외가 없으면 지적한다', () => {
    const checks = runChecks(
      data({ rules: ['a', 'b', 'c', 'd'].map((id) => rule(id, { scenarioId: 'SC-9' })) }),
    )
    expect(find(checks, 'FR-505').targetIds).toEqual(['SC-9'])
  })

  it('예외 유형이 하나라도 있으면 지적하지 않는다', () => {
    const checks = runChecks(
      data({
        rules: [
          ...['a', 'b', 'c'].map((id) => rule(id, { scenarioId: 'SC-9' })),
          rule('d', { scenarioId: 'SC-9', ruleType: '예외처리' }),
        ],
      }),
    )
    expect(find(checks, 'FR-505').targetIds).toEqual([])
  })

  it('규칙이 3건뿐이면 지적하지 않는다', () => {
    const checks = runChecks(
      data({ rules: ['a', 'b', 'c'].map((id) => rule(id, { scenarioId: 'SC-9' })) }),
    )
    expect(find(checks, 'FR-505').targetIds).toEqual([])
  })
})

describe('FR-506 한쪽 흐름만 있는 시나리오', () => {
  it('들어오거나 나가는 관계가 없으면 잡는다', () => {
    const sc = (id: string) => ({ id, name: id, displayName: id, area: '' })
    const checks = runChecks(
      data({
        scenarios: [sc('SC-1'), sc('SC-2'), sc('SC-3')],
        relations: [
          {
            id: 'R1',
            fromScenarioId: 'SC-1',
            toScenarioId: 'SC-2',
            kind: '전환',
            condition: 'c',
            basisRuleId: null,
          },
          {
            id: 'R2',
            fromScenarioId: 'SC-2',
            toScenarioId: 'SC-3',
            kind: '전환',
            condition: 'c',
            basisRuleId: null,
          },
        ],
      }),
    )
    // SC-1 은 들어오는 게 없고 SC-3 은 나가는 게 없다. SC-2 는 양쪽 다 있다.
    expect(find(checks, 'FR-506').targetIds).toEqual(['SC-1', 'SC-3'])
  })
})

describe('FR-507 공통 모듈 후보', () => {
  it('3개 이상 시나리오에 걸친 기능 그룹을 잡는다', () => {
    const checks = runChecks(
      data({
        rules: [
          rule('a', { scenarioId: 'SC-1' }),
          rule('b', { scenarioId: 'SC-2' }),
          rule('c', { scenarioId: 'SC-3' }),
          rule('d', { scenarioId: 'SC-1' }),
        ],
        capabilities: [
          {
            id: 'CAP-01',
            devScenarioId: 'DEV-A',
            name: '넓게 걸침',
            description: '',
            ruleIds: ['a', 'b', 'c'],
          },
          {
            id: 'CAP-02',
            devScenarioId: 'DEV-A',
            name: '한 곳',
            description: '',
            ruleIds: ['a', 'd'],
          },
        ],
      }),
    )
    expect(find(checks, 'FR-507').targetIds).toEqual(['CAP-01'])
  })
})

describe('FR-508 검토 필요 상태', () => {
  it('상태가 검토 필요인 규칙을 잡는다', () => {
    const checks = runChecks(data({ rules: [rule('a'), rule('b', { status: '검토 필요' })] }))
    expect(find(checks, 'FR-508').targetIds).toEqual(['b'])
  })
})

describe('뱃지 건수 (FR-003)', () => {
  it('경고만 세고 정보는 세지 않는다', () => {
    const checks = runChecks(
      data({
        scenarios: [{ id: 'SC-1', name: 'a', displayName: 'a', area: '' }], // FR-506 정보 1건
        rules: [rule('a', { owner: '미지정', capabilityId: null })], // 경고 2건
      }),
    )
    expect(warningCount(checks)).toBe(2)
  })

  it('검사 8종을 모두 돌려준다 — 지적이 없어도 항목은 남는다', () => {
    const checks = runChecks(data())
    expect(checks.map((c) => c.code)).toEqual([
      'FR-501',
      'FR-502',
      'FR-503',
      'FR-504',
      'FR-505',
      'FR-506',
      'FR-507',
      'FR-508',
    ])
    expect(warningCount(checks)).toBe(0)
  })
})
