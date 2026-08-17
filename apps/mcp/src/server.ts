#!/usr/bin/env -S node --experimental-strip-types
/**
 * 시나리오 스튜디오 MCP 서버 (stdio).
 * 에이전트가 BR 을 수정하고 BR 간 관계를 산출하는 데 쓴다.
 *
 * 등록 예:
 *   claude mcp add scenario-studio -- pnpm --filter @oss/mcp start
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerTools } from './tools'

const server = new McpServer({
  name: 'scenario-studio',
  version: '0.0.0',
})

registerTools(server)

// stdio 는 stdout 이 프로토콜 채널이다. 로그를 찍으면 통신이 깨진다.
await server.connect(new StdioServerTransport())
