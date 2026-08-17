/**
 * MCP 도구 정의. 에이전트가 BR 수정과 BR 간 관계 산출을 하는 데 필요한 것만 노출한다.
 *
 * 쓰기는 전부 건 단위이고 version 을 요구한다. 사람이 화면에서 같은 데이터를
 * 고치고 있을 수 있으므로, 어긋나면 거절하고 다시 읽게 한다(NFR-03).
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api, PROJECT_ID } from './caller'

/** MCP 응답 한 덩어리. 구조화된 값은 JSON 으로 실어 보낸다. */
function ok(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    'get_project',
    {
      title: '프로젝트 전체 조회',
      description:
        '시나리오·규칙·시나리오 간 관계·BR 간 관계·기능 그룹·개발 시나리오를 한 번에 돌려준다. ' +
        'BR 간 관계를 찾거나 기능 그룹을 다시 묶으려면 전체를 봐야 하므로 이 도구부터 부른다.',
    },
    async () => {
      try {
        return ok(await api.project.data({ projectId: PROJECT_ID }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'get_rule',
    {
      title: '규칙 한 건 조회',
      description:
        '규칙 하나의 현재 값과 version 을 돌려준다. 규칙을 고치기 직전에 불러 version 을 얻는다.',
      inputSchema: { id: z.string().describe('BR ID. 예: SC-1.5') },
    },
    async ({ id }) => {
      try {
        return ok(await api.rule.get({ projectId: PROJECT_ID, id }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'check_integrity',
    {
      title: '참조 무결성 검사',
      description:
        '없는 ID 참조, 중복, 자기참조 같은 데이터 깨짐을 찾는다. ' +
        '관계를 여러 건 만든 뒤 스스로 검증할 때 쓴다. 빈 배열이면 문제가 없다는 뜻이다.',
    },
    async () => {
      try {
        return ok(await api.project.integrity({ projectId: PROJECT_ID }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'update_rule',
    {
      title: '규칙 수정',
      description:
        '규칙의 필드를 고친다. version 이 현재 값과 다르면 거절한다 — 그때는 get_rule 로 다시 읽고 재시도한다. ' +
        '바꾸려는 필드만 넣는다. 변경 전 값은 이력에 남으므로 되돌릴 수 있다.',
      inputSchema: {
        id: z.string().describe('BR ID'),
        version: z.number().int().describe('get_rule 로 읽은 version'),
        statement: z.string().optional().describe('규칙 문장'),
        ruleType: z.string().optional().describe('유형'),
        owner: z.string().optional().describe('담당 주체'),
        status: z.string().optional().describe('상태. 예: 초안 · 검토 필요 · 확정'),
        scenarioId: z.string().optional().describe('소속 시나리오를 옮길 때'),
        openIssue: z.string().optional().describe('미결 사항. 값이 미정이면 여기에 적는다'),
      },
    },
    async ({ id, version, ...patch }) => {
      try {
        return ok(await api.rule.update({ projectId: PROJECT_ID, id, version, patch }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'assign_rule_to_capability',
    {
      title: '규칙을 기능 그룹에 배정',
      description:
        '규칙이 속할 기능 그룹(CAP)을 바꾼다. capabilityId 를 비우면 미배정으로 되돌린다. ' +
        '규칙은 최대 하나의 기능 그룹에만 속한다.',
      inputSchema: {
        id: z.string().describe('BR ID'),
        version: z.number().int().describe('get_rule 로 읽은 version'),
        capabilityId: z.string().nullable().describe('CAP ID. null 이면 미배정'),
      },
    },
    async ({ id, version, capabilityId }) => {
      try {
        return ok(
          await api.rule.assignCapability({ projectId: PROJECT_ID, id, version, capabilityId }),
        )
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'create_rule_link',
    {
      title: 'BR 간 관계 생성',
      description:
        '규칙 사이의 관계를 만든다. 방향이 있다 — from 이 기준, to 가 연결 대상이다. ' +
        '자기 자신과는 연결할 수 없고, 같은 두 규칙 사이에 같은 종류를 두 번 만들 수 없다.',
      inputSchema: {
        id: z.string().describe('LINK ID. 예: L-4'),
        fromRuleId: z.string().describe('기준 BR ID'),
        toRuleId: z.string().describe('연결 BR ID'),
        kind: z.string().describe('관계 종류: 선행 · 예외 · 대체 · 데이터 의존'),
        note: z.string().default('').describe('왜 그렇게 판단했는지'),
      },
    },
    async (input) => {
      try {
        return ok(await api.link.create({ projectId: PROJECT_ID, ...input }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'list_rule_links',
    {
      title: 'BR 간 관계 목록',
      description:
        '관계를 version 과 함께 돌려준다. 관계를 지우기 전에 이 도구로 version 을 얻는다.',
    },
    async () => {
      try {
        return ok(await api.link.list({ projectId: PROJECT_ID }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'delete_rule_link',
    {
      title: 'BR 간 관계 삭제',
      description: '관계를 지운다. version 이 어긋나면 거절한다.',
      inputSchema: {
        id: z.string().describe('LINK ID'),
        version: z.number().int().describe('list_rule_links 로 읽은 version'),
      },
    },
    async ({ id, version }) => {
      try {
        return ok(await api.link.delete({ projectId: PROJECT_ID, id, version }))
      } catch (error) {
        return fail(error)
      }
    },
  )
}
