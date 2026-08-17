import { PrismaPg } from '@prisma/adapter-pg'
import { databaseUrl } from './env'
import { PrismaClient } from './generated/prisma/client'

// Prisma 7 은 드라이버 어댑터로 연결한다. 실제 접속은 첫 질의 시점이다.
const adapter = new PrismaPg({ connectionString: databaseUrl() })

export const prisma = new PrismaClient({ adapter })
export type Db = typeof prisma
