/**
 * MCP 도구는 HTTP 를 거치지 않고 tRPC 프로시저를 직접 호출한다.
 * 웹과 완전히 같은 경로를 타므로 낙관적 잠금과 이력 적재가 저절로 적용된다.
 */
import { appRouter } from '@oss/api/router'
import { createCallerFactory, createDirectContext } from '@oss/api/trpc'

/** 에이전트 이름. 이력에 "누가 고쳤는지"로 남는다. */
const AGENT_LABEL = process.env.OSS_AGENT_LABEL ?? 'mcp-agent'

/** 프로젝트를 도구 인자마다 받지 않고 환경에서 고정한다. 에이전트가 실수로 남의 프로젝트를 건드리지 않게. */
export const PROJECT_ID = process.env.OSS_PROJECT_ID ?? 'default'

const createCaller = createCallerFactory(appRouter)

export const api = createCaller(
  createDirectContext({
    type: 'AGENT',
    userId: process.env.OSS_USER_ID ?? null,
    label: AGENT_LABEL,
  }),
)
