import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { databaseFilePath } from './env'
import { PrismaClient } from './generated/prisma/client'

const path = databaseFilePath()
mkdirSync(dirname(path), { recursive: true })

// Prisma 7 은 드라이버 어댑터로 연결한다. 실제 접속은 첫 질의 시점이다.
const adapter = new PrismaBetterSqlite3({ url: `file:${path}` })

export const prisma = new PrismaClient({ adapter })
export type Db = typeof prisma
