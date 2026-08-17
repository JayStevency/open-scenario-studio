import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { prisma } from './prisma'

export interface Context {
  prisma: typeof prisma
  /** 사내 인증 연동 전까지는 헤더로 흉내 낸다(NFR-06). */
  userId: string | null
}

export function createContext({ req }: CreateFastifyContextOptions): Context {
  const header = req.headers['x-user-id']
  return { prisma, userId: typeof header === 'string' ? header : null }
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

/** 로그인 사용자만. 이력에 작성자를 남기려면 필수다(FR-406). */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.userId === null) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요하다' })
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})
