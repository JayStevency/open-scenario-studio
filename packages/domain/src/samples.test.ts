/**
 * 예제 데이터가 성립하는지 검증한다.
 * 공개 저장소에서 처음 만나는 데이터라 깨져 있으면 안 된다.
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { hasDesignData, readDesignData } from './designData'
import { checkIntegrity } from './integrity'
import { parseProjectData } from './mappers'

const dir = resolve(fileURLToPath(new URL('../../../', import.meta.url)), 'samples/order-flow')

describe('예제 데이터 (samples/order-flow)', () => {
  it('여섯 개 파일이 모두 있다', () => {
    expect(hasDesignData(dir)).toBe(true)
  })

  const data = parseProjectData(readDesignData(dir))

  it('참조 무결성 위반이 없다', () => {
    expect(checkIntegrity(data)).toEqual([])
  })

  it('관계 종류 네 가지를 모두 보여준다', () => {
    const kinds = new Set(data.links.map((l) => l.kind))
    expect(kinds).toEqual(new Set(['선행', '예외', '대체', '데이터 의존']))
  })

  it('검사 대상이 되는 빈 값을 일부러 남겨둔다', () => {
    // FR-501 담당 주체 미지정 · FR-502 기능 그룹 미배정 · FR-503 조건 없는 관계
    expect(data.rules.some((r) => r.owner === '미지정')).toBe(true)
    expect(data.rules.some((r) => r.capabilityId === null)).toBe(true)
    expect(data.relations.some((r) => r.condition === '')).toBe(true)
  })
})
