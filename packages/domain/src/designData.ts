/**
 * TSV 데이터를 파일 시스템에서 읽는다. Node 환경(서버·스크립트·테스트) 전용.
 *
 * 기본 위치는 `design/data/` 이고, 여기에는 프로젝트마다 다른 실제 명세가 들어간다.
 * 저장소에 올리지 않으므로 없을 수 있다는 것을 전제로 다룬다.
 * `OSS_DATA_DIR` 로 다른 위치를 가리킬 수 있다 — 예제 데이터를 넣을 때 쓴다.
 */
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TSV_FILENAMES, type TsvSources } from './mappers'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/** 실제로 읽을 디렉터리. OSS_DATA_DIR 이 있으면 그쪽, 없으면 design/data. */
export function dataDir(): string {
  const fromEnv = process.env.OSS_DATA_DIR
  if (fromEnv !== undefined && fromEnv !== '') {
    return isAbsolute(fromEnv) ? fromEnv : resolve(REPO_ROOT, fromEnv)
  }
  return resolve(REPO_ROOT, 'design/data')
}

function pathOf(filename: string, dir = dataDir()): string {
  return resolve(dir, filename)
}

/** 여섯 개 TSV 가 모두 있는지. */
export function hasDesignData(dir = dataDir()): boolean {
  return Object.values(TSV_FILENAMES).every((name) => existsSync(pathOf(name, dir)))
}

/** 없으면 던진다. 부르기 전에 hasDesignData() 로 확인한다. */
export function readDesignData(dir = dataDir()): TsvSources {
  const read = (name: string) => {
    const path = pathOf(name, dir)
    if (!existsSync(path)) {
      throw new Error(
        `${name} 이 ${dir} 에 없다. TSV 여섯 개를 넣거나 OSS_DATA_DIR 로 다른 위치를 가리켜라.`,
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
