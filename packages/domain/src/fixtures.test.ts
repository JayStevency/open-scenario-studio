import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkIntegrity } from './integrity'
import { parseProjectData, TSV_FILENAMES, type TsvSources } from './mappers'

function readDesignData(): TsvSources {
  const dir = new URL('../../../design/data/', import.meta.url)
  const read = (name: string) => readFileSync(fileURLToPath(new URL(name, dir)), 'utf8')
  return {
    scenarios: read(TSV_FILENAMES.scenarios),
    rules: read(TSV_FILENAMES.rules),
    relations: read(TSV_FILENAMES.relations),
    capabilities: read(TSV_FILENAMES.capabilities),
    devScenarios: read(TSV_FILENAMES.devScenarios),
    links: read(TSV_FILENAMES.links),
  }
}

const data = parseProjectData(readDesignData())

describe('design/data 적재', () => {
  it('design/data/README.md 가 적어둔 건수와 맞는다', () => {
    expect(data.scenarios).toHaveLength(13)
    expect(data.rules).toHaveLength(96)
    expect(data.relations).toHaveLength(18)
    expect(data.capabilities).toHaveLength(14)
    expect(data.devScenarios).toHaveLength(5)
    expect(data.links).toHaveLength(3)
  })

  it('첫 규칙이 열 매핑대로 들어온다', () => {
    expect(data.rules[0]).toMatchObject({
      id: 'SC-0.1',
      scenarioId: 'SC-0',
      ruleType: '상태',
      capabilityId: 'CAP-09',
      status: '초안',
    })
  })
})

describe('참조 무결성', () => {
  it('design/data 에 위반이 없다', () => {
    expect(checkIntegrity(data)).toEqual([])
  })
})
