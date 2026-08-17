/**
 * design/data/*.tsv 를 파일 시스템에서 읽는다. Node 환경(서버·스크립트·테스트) 전용.
 *
 * 이 파일들은 프로젝트마다 다른 실제 명세라 저장소에 올리지 않는다.
 * 없을 수 있다는 것을 전제로 다룬다.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { TSV_FILENAMES, type TsvSources } from './mappers'

const DIR = new URL('../../../design/data/', import.meta.url)

function pathOf(filename: string): string {
  return fileURLToPath(new URL(filename, DIR))
}

/** 여섯 개 TSV 가 모두 있는지. */
export function hasDesignData(): boolean {
  return Object.values(TSV_FILENAMES).every((name) => existsSync(pathOf(name)))
}

/** 없으면 던진다. 부르기 전에 hasDesignData() 로 확인한다. */
export function readDesignData(): TsvSources {
  const read = (name: string) => {
    const path = pathOf(name)
    if (!existsSync(path)) {
      throw new Error(
        `${name} 이 없다. design/data/ 에 TSV 여섯 개를 넣어라 — 저장소에는 올리지 않는다.`,
      )
    }
    return readFileSync(path, 'utf8')
  }

  return {
    scenarios: read(TSV_FILENAMES.scenarios),
    rules: read(TSV_FILENAMES.rules),
    relations: read(TSV_FILENAMES.relations),
    capabilities: read(TSV_FILENAMES.capabilities),
    devScenarios: read(TSV_FILENAMES.devScenarios),
    links: read(TSV_FILENAMES.links),
  }
}
