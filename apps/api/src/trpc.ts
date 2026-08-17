import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { prisma } from './prisma'

/**
 * 무언가를 고친 주체. 사람과 에이전트를 구분해 이력에 남긴다.
 * 에이전트가 명세를 직접 수정하므로 "이건 에이전트가 고친 것"을 나중에 걸러 볼 수 있어야 한다.
 */
export interface Actor {
  type: 'USER' | 'AGENT'
  /** 사람이면 User.id. 에이전트는 사용자 레코드가 없을 수 있어 null 을 허용한다. */
  userId: string | null
  /** 에이전트 이름. 사람이면 null. */
  label: string | null
}

export interface Context {
  prisma: typeof prisma
  actor: Actor
}

/** MCP 처럼 HTTP 를 거치지 않고 직접 호출할 때 쓴다. */
export function createDirectContext(actor: Actor): Context {
  return { prisma, actor }
}

export function createContext({ req }: CreateFastifyContextOptions): Context {
  const header = (name: string) => {
    const value = req.headers[name]
    return typeof value === 'string' && value !== '' ? value : null
  }

  const agentLabel = header('x-agent-label')
  if (agentLabel !== null) {
    return createDirectContext({ type: 'AGENT', userId: header('x-user-id'), label: agentLabel })
  }

  // 사내 인증 연동 전까지는 헤더로 흉내 낸다(NFR-06).
  return createDirectContext({ type: 'USER', userId: header('x-user-id'), label: null })
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory

/** 신원이 밝혀진 주체만 고칠 수 있다. 이력에 작성자를 남기려면 필수다(FR-406). */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  const identified = ctx.actor.userId !== null || ctx.actor.label !== null
  if (!identified) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '작업 주체를 알 수 없다' })
  }
  return next({ ctx })
})
