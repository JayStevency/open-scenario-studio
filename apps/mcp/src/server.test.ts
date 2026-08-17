/**
 * MCP 서버를 실제 클라이언트로 붙여 확인한다.
 * DB 가 없어도 도구 목록과 스키마, 오류 처리 경로는 검증된다.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { registerTools } from './tools'

const client = new Client({ name: 'test', version: '0.0.0' })

beforeAll(async () => {
  const server = new McpServer({ name: 'scenario-studio', version: '0.0.0' })
  registerTools(server)

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
})

describe('도구 등록', () => {
  it('읽기·쓰기 도구가 모두 노출된다', async () => {
    const names = (await client.listTools()).tools.map((t) => t.name).sort()
    expect(names).toEqual([
      'assign_rule_to_capability',
      'check_integrity',
      'create_rule_link',
      'delete_rule_link',
      'get_project',
      'get_rule',
      'list_rule_links',
      'update_rule',
    ])
  })

  it('쓰기 도구는 version 을 요구한다 — 사람과 부딪히지 않게', async () => {
    const tools = (await client.listTools()).tools
    for (const name of ['update_rule', 'assign_rule_to_capability', 'delete_rule_link']) {
      const tool = tools.find((t) => t.name === name)
      expect(tool?.inputSchema.required, name).toContain('version')
    }
  })

  it('설명에 관계 종류 네 가지가 적혀 있다', async () => {
    const tools = (await client.listTools()).tools
    const schema = tools.find((t) => t.name === 'create_rule_link')?.inputSchema
    expect(JSON.stringify(schema)).toContain('데이터 의존')
  })
})

describe('입력 검증', () => {
  it('자기 자신과 연결하면 거절한다 (FR-405)', async () => {
    const result = await client.callTool({
      name: 'create_rule_link',
      arguments: { id: 'L-99', fromRuleId: 'SC-1.1', toRuleId: 'SC-1.1', kind: '선행' },
    })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result.content)).toContain('자기 자신')
  })

  it('필수 인자가 빠지면 오류로 돌려준다', async () => {
    const result = await client.callTool({ name: 'update_rule', arguments: { id: 'SC-1.1' } })
    expect(result.isError).toBe(true)
  })
})
