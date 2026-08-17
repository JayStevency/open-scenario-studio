import { describe, expect, it } from 'vitest'
import { hasDesignData, readDesignData } from './designData'
import { checkIntegrity } from './integrity'
import { parseProjectData } from './mappers'

// design/data 는 저장소에 없다. 있을 때만 검증한다.
const present = hasDesignData()
const data = present ? parseProjectData(readDesignData()) : null

describe.skipIf(!present)('design/data 적재', () => {
  it('design/data/README.md 가 적어둔 건수와 맞는다', () => {
    expect(data?.scenarios).toHaveLength(13)
    expect(data?.rules).toHaveLength(96)
    expect(data?.relations).toHaveLength(18)
    expect(data?.capabilities).toHaveLength(14)
    expect(data?.devScenarios).toHaveLength(5)
    expect(data?.links).toHaveLength(3)
  })

  it('첫 규칙이 열 매핑대로 들어온다', () => {
    expect(data?.rules[0]).toMatchObject({
      id: 'SC-0.1',
      scenarioId: 'SC-0',
      ruleType: '상태',
      capabilityId: 'CAP-09',
      status: '초안',
    })
  })
})

describe.skipIf(!present)('참조 무결성', () => {
  it('design/data 에 위반이 없다', () => {
    expect(checkIntegrity(data!)).toEqual([])
  })
})
