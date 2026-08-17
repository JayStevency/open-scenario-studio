import { checkIntegrity } from '@oss/domain'
import { describe, expect, it } from 'vitest'
import { loadSeedData } from './seed'

// 건수·매핑 검증은 @oss/domain 이 한다. 여기서는 vite 의 ?raw 경로가 살아 있는지만 본다.
describe('오프라인 시드', () => {
  it('design/data 를 번들러를 통해 읽어 온다', () => {
    const data = loadSeedData()
    expect(data.rules.length).toBeGreaterThan(0)
    expect(data.scenarios.length).toBeGreaterThan(0)
    expect(checkIntegrity(data)).toEqual([])
  })
})
