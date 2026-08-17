/**
 * MCP 서버를 stdio 로 띄우고 실제 DB 에 대고 도구를 한 바퀴 돌린다.
 * `pnpm --filter @oss/mcp smoke` — DB 가 마이그레이션·시드된 상태여야 한다.
 *
 * 바꾼 값은 끝에 되돌린다. 단위 테스트가 아니라 연결 전체가 살아 있는지 보는 점검이다.
 */

import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const client = new Client({ name: 'smoke', version: '0.0.0' })

await client.connect(
  new StdioClientTransport({
    command: 'pnpm',
    args: ['--filter', '@oss/mcp', 'start'],
    cwd: repoRoot,
  }),
)

let failed = 0

function report(label: string, passed: boolean, detail: string) {
  if (!passed) failed++
  console.log(`${passed ? '  ✓' : '  ✗'} ${label.padEnd(22)} ${detail}`)
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = (await client.callTool({ name, arguments: args })) as {
    isError?: boolean
    content: { text: string }[]
  }
  return { isError: result.isError ?? false, text: result.content[0]?.text ?? '' }
}

// 읽기
const project = JSON.parse((await call('get_project')).text)
report(
  'get_project',
  project.rules.length > 0 && project.scenarios.length > 0,
  `SC ${project.scenarios.length} · BR ${project.rules.length} · LINK ${project.links.length}`,
)

// 데이터셋마다 ID 가 다르므로 읽어온 것에서 고른다.
// 아직 관계로 이어지지 않은 두 규칙을 써야 중복 판정에 걸리지 않는다.
const linked = new Set(
  project.links.flatMap((l: { fromRuleId: string; toRuleId: string }) => [
    `${l.fromRuleId}->${l.toRuleId}`,
  ]),
)
const pair = project.rules
  .flatMap((a: { id: string }) => project.rules.map((b: { id: string }) => [a.id, b.id]))
  .find(([a, b]: [string, string]) => a !== b && !linked.has(`${a}->${b}`))
if (pair === undefined) throw new Error('쓸 만한 규칙 쌍이 없다 — 데이터를 먼저 시드해라')
const [ruleA, ruleB] = pair as [string, string]

const original = JSON.parse((await call('get_rule', { id: ruleA })).text)
report('get_rule', typeof original.version === 'number', `version=${original.version}`)

// 쓰기 + 낙관적 잠금
const updated = await call('update_rule', {
  id: ruleA,
  version: original.version,
  openIssue: 'smoke 점검용 메모',
})
report('update_rule', !updated.isError, updated.isError ? updated.text : '수정됨')

const stale = await call('update_rule', {
  id: ruleA,
  version: original.version,
  statement: '덮어쓰기 시도',
})
report(
  '낡은 version 거절',
  stale.isError && stale.text.includes('먼저 고쳤다'),
  stale.isError ? '거절됨' : '통과해버림',
)

// BR 간 관계
const created = await call('create_rule_link', {
  id: 'L-smoke',
  fromRuleId: ruleA,
  toRuleId: ruleB,
  kind: '선행',
  note: 'smoke',
})
report('create_rule_link', !created.isError, created.isError ? created.text : '생성됨')

const duplicate = await call('create_rule_link', {
  id: 'L-smoke-2',
  fromRuleId: ruleA,
  toRuleId: ruleB,
  kind: '선행',
})
report('중복 관계 거절', duplicate.isError, duplicate.isError ? '거절됨' : '통과해버림')

const violations = JSON.parse((await call('check_integrity')).text)
report('check_integrity', violations.length === 0, `위반 ${violations.length}건`)

// 되돌리기
const links = JSON.parse((await call('list_rule_links')).text)
const smokeLink = links.find((l: { id: string }) => l.id === 'L-smoke')
const deleted = await call('delete_rule_link', { id: 'L-smoke', version: smokeLink.version })
report('delete_rule_link', !deleted.isError, deleted.isError ? deleted.text : '삭제됨')

const current = JSON.parse((await call('get_rule', { id: ruleA })).text)
await call('update_rule', {
  id: ruleA,
  version: current.version,
  openIssue: original.openIssue ?? '',
})

await client.close()

console.log(failed === 0 ? '\n전부 통과' : `\n${failed}건 실패`)
process.exit(failed === 0 ? 0 : 1)
