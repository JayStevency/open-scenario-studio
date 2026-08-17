import { checkIntegrity } from '@oss/domain'
import { describe, expect, it } from 'vitest'
import { hasSeedData, loadSeedData } from './seed'

// design/data 는 저장소에 없다. 있을 때만 검증한다.
describe('오프라인 시드', () => {
  it.skipIf(!hasSeedData())('design/data 를 번들러를 통해 읽어 온다', () => {
    const data = loadSeedData()
    expect(data.rules.length).toBeGreaterThan(0)
    expect(data.scenarios.length).toBeGreaterThan(0)
    expect(checkIntegrity(data)).toEqual([])
  })

  it('파일이 없어도 빈 데이터로 버틴다 — 빌드가 깨지면 안 된다', () => {
    const data = loadSeedData()
    expect(Array.isArray(data.rules)).toBe(true)
    expect(checkIntegrity(data)).toEqual([])
  })
})
