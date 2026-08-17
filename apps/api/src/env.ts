import { fileURLToPath } from 'node:url'
import 'dotenv/config'

/**
 * SQLite 파일 경로. 저장소 루트 기준으로 푼다.
 *
 * api 는 apps/api 에서, mcp 는 apps/mcp 에서 돌기 때문에 상대 경로를 그대로 두면
 * 프로세스마다 다른 파일을 보게 된다. 그래서 이 파일 위치를 기준으로 절대 경로를 만든다.
 */
const DEFAULT_DB_PATH = fileURLToPath(new URL('../../../data/scenario-studio.db', import.meta.url))

/**
 * 개발 중에는 .env 없이도 저장소 안의 파일로 붙는다.
 * 다른 위치를 쓰려면 DATABASE_URL 에 `file:/절대/경로.db` 형태로 준다.
 */
export function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv

  return `file:${DEFAULT_DB_PATH}`
}

/** better-sqlite3 은 URL 이 아니라 파일 경로를 받는다. */
export function databaseFilePath(): string {
  return databaseUrl().replace(/^file:/, '')
}
