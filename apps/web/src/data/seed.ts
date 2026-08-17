/**
 * 서버 없이 화면을 만들 때 쓰는 시드 데이터.
 *
 * design/data/*.tsv 는 프로젝트마다 다른 실제 명세라 저장소에 올리지 않는다.
 * 파일이 없으면 빈 데이터를 돌려준다 — 정적 import 를 쓰면 파일이 없을 때
 * 빌드가 깨지므로 glob 으로 읽는다.
 */
import { type ProjectData, parseProjectData, TSV_FILENAMES } from '@oss/domain'

const files = import.meta.glob('../../../../design/data/*.tsv', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function read(filename: string): string {
  const entry = Object.entries(files).find(([path]) => path.endsWith(`/${filename}`))
  return entry?.[1] ?? ''
}

/** design/data 가 있으면 그 내용을, 없으면 빈 데이터를 돌려준다. */
export function loadSeedData(): ProjectData {
  return parseProjectData({
    scenarios: read(TSV_FILENAMES.scenarios),
    rules: read(TSV_FILENAMES.rules),
    relations: read(TSV_FILENAMES.relations),
    capabilities: read(TSV_FILENAMES.capabilities),
    devScenarios: read(TSV_FILENAMES.devScenarios),
    links: read(TSV_FILENAMES.links),
  })
}

/** 시드 파일이 있는지. 화면이 "데이터를 넣어라"를 안내할 때 쓴다. */
export function hasSeedData(): boolean {
  return read(TSV_FILENAMES.rules) !== ''
}
