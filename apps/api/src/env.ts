import 'dotenv/config'

/** docker-compose.yml 의 로컬 DB. 개발 편의용이며 비밀이 아니다. */
const LOCAL_DATABASE_URL = 'postgresql://oss:oss@localhost:5432/scenario_studio?schema=public'

/**
 * 개발 중에는 .env 없이도 로컬 DB 로 붙는다.
 * 프로덕션에서는 반드시 명시해야 하고, 없으면 기동을 멈춘다.
 */
export function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv

  if (process.env.NODE_ENV === 'production') {
    throw new Error('프로덕션에서는 DATABASE_URL 이 반드시 있어야 한다')
  }
  return LOCAL_DATABASE_URL
}
