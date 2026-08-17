/**
 * FR-400 시나리오 상세 · BR 간 관계.
 *
 * 에이전트가 MCP 로 만든 BR 간 관계를 사람이 처음으로 보는 화면이다.
 * 관계를 만들고 해제하고, 자동 기록과 메모를 시간순으로 본다.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { PROJECT_ID } from '../api/project'
import { trpc } from '../api/trpc'

/**
 * 이력 한 줄. 라우터 추론 타입을 그대로 쓰면 인스턴스화가 너무 깊어져
 * 타입 검사가 포기한다. 화면이 쓰는 만큼만 적어 끊는다.
 */
interface HistoryEntry {
  id: number
  at: string | Date
  actorType: 'USER' | 'AGENT'
  actorLabel: string | null
  entityType: string
  entityId: string
  action: string
  note: string | null
}

/** FR-403 관계 종류. 관리자 설정 화면이 생기면 프로젝트별 목록으로 바뀐다. */
const LINK_KINDS = ['선행', '예외', '대체', '데이터 의존'] as const

export function ScenarioDetail() {
  const scenarios = useQuery(trpc.scenario.list.queryOptions({ projectId: PROJECT_ID }))
  const [selected, setSelected] = useState<string | null>(null)

  const current = selected ?? scenarios.data?.[0]?.id ?? null

  if (scenarios.isPending) return <p className="placeholder">불러오는 중…</p>
  if (scenarios.isError) {
    return (
      <p className="placeholder error">시나리오를 불러오지 못했다: {scenarios.error.message}</p>
    )
  }
  if (current === null) {
    return <p className="placeholder">시나리오가 없다.</p>
  }

  return (
    <div className="detail">
      <aside className="detail-side">
        {scenarios.data.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === current ? 'active' : ''}
            onClick={() => setSelected(s.id)}
          >
            <span className="sc-id">{s.id}</span>
            <span className="sc-name">{s.name}</span>
          </button>
        ))}
      </aside>

      <section className="detail-main">
        <Detail scenarioId={current} />
      </section>
    </div>
  )
}

function Detail({ scenarioId }: { scenarioId: string }) {
  const queryClient = useQueryClient()
  const input = { projectId: PROJECT_ID, id: scenarioId }

  const detail = useQuery(trpc.scenario.detail.queryOptions(input))
  const allRules = useQuery(trpc.rule.list.queryOptions({ projectId: PROJECT_ID }))
  const history = useQuery(
    trpc.history.list.queryOptions({ projectId: PROJECT_ID, scenarioId, limit: 50 }),
  )

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.scenario.detail.queryKey(input) }),
      queryClient.invalidateQueries({
        queryKey: trpc.history.list.queryKey({ projectId: PROJECT_ID, scenarioId, limit: 50 }),
      }),
    ])
  }

  const createLink = useMutation(trpc.link.create.mutationOptions({ onSuccess: refresh }))
  const deleteLink = useMutation(trpc.link.delete.mutationOptions({ onSuccess: refresh }))
  const addNote = useMutation(trpc.history.addNote.mutationOptions({ onSuccess: refresh }))

  if (detail.isPending) return <p className="placeholder">불러오는 중…</p>
  if (detail.isError) {
    return <p className="placeholder error">불러오지 못했다: {detail.error.message}</p>
  }

  const { scenario, rules, incoming, outgoing, links } = detail.data
  const ownRuleIds = new Set(rules.map((r) => r.id))

  return (
    <>
      <div className="detail-head">
        <h2>
          <span className="sc-id">{scenario.id}</span> {scenario.name}
        </h2>
        <p className="detail-meta">
          {scenario.area}
          {scenario.displayName !== scenario.name && ` · 표시명 ${scenario.displayName}`}
        </p>
        {/* FR-401 관계 요약 */}
        <dl className="counts">
          <Count label="규칙" value={rules.length} />
          <Count label="들어오는" value={incoming.length} />
          <Count label="나가는" value={outgoing.length} />
          <Count label="BR 간" value={links.length} />
        </dl>
      </div>

      <section className="panel">
        <h3>규칙 {rules.length}건</h3>
        <ul className="rule-list">
          {rules.map((r) => (
            <li key={r.id}>
              <code>{r.id}</code>
              <span className="rule-type">{r.ruleType}</span>
              <span className="rule-statement">{r.statement}</span>
              <span className={`rule-status status-${r.status === '확정' ? 'done' : 'draft'}`}>
                {r.status}
              </span>
            </li>
          ))}
          {rules.length === 0 && <li className="empty">규칙이 없다.</li>}
        </ul>
      </section>

      <section className="panel">
        <h3>BR 간 관계 {links.length}건</h3>
        <p className="panel-note">
          기준 규칙과 연결 규칙 중 하나라도 이 시나리오에 속하면 보여준다.
        </p>

        <ul className="link-list">
          {links.map((l) => (
            <li key={l.id}>
              <code className={ownRuleIds.has(l.fromId) ? 'own' : ''}>{l.fromId}</code>
              <span className={`link-kind kind-${LINK_KINDS.indexOf(l.kind as never) + 1}`}>
                {l.kind}
              </span>
              <code className={ownRuleIds.has(l.toId) ? 'own' : ''}>{l.toId}</code>
              {l.note !== null && l.note !== '' && <span className="link-note">{l.note}</span>}
              <button
                type="button"
                className="unlink"
                disabled={deleteLink.isPending}
                onClick={() =>
                  deleteLink.mutate({ projectId: PROJECT_ID, id: l.id, version: l.version })
                }
              >
                해제
              </button>
            </li>
          ))}
          {links.length === 0 && <li className="empty">아직 관계가 없다.</li>}
        </ul>

        <LinkForm
          ownRules={rules.map((r) => ({ id: r.id, statement: r.statement }))}
          allRules={(allRules.data ?? []).map((r) => ({ id: r.id, statement: r.statement }))}
          pending={createLink.isPending}
          error={createLink.error?.message ?? null}
          onCreate={(from, to, kind, note) =>
            createLink.mutate({
              projectId: PROJECT_ID,
              // ID 는 사람이 읽을 수 있게. 삭제한 ID 는 재사용하지 않는다.
              id: `L-${Date.now().toString(36)}`,
              fromRuleId: from,
              toRuleId: to,
              kind,
              note,
            })
          }
        />
      </section>

      <section className="panel">
        <h3>변경 이력과 메모</h3>
        <NoteForm
          pending={addNote.isPending}
          onAdd={(note) => addNote.mutate({ projectId: PROJECT_ID, scenarioId, note })}
        />
        <ol className="history">
          {((history.data ?? []) as HistoryEntry[]).map((h) => (
            <li key={h.id}>
              <time>{new Date(h.at).toLocaleString('ko-KR')}</time>
              <span className={`actor actor-${h.actorType === 'AGENT' ? 'agent' : 'user'}`}>
                {h.actorType === 'AGENT' ? '에이전트' : '사람'}
                {h.actorLabel !== null && ` · ${h.actorLabel}`}
              </span>
              <span className="what">
                {h.action === 'note' ? h.note : `${h.entityType} ${h.entityId} ${h.action}`}
              </span>
            </li>
          ))}
          {(history.data ?? []).length === 0 && <li className="empty">기록이 없다.</li>}
        </ol>
      </section>
    </>
  )
}

interface RuleRef {
  id: string
  statement: string
}

function LinkForm({
  ownRules,
  allRules,
  pending,
  error,
  onCreate,
}: {
  ownRules: RuleRef[]
  allRules: RuleRef[]
  pending: boolean
  error: string | null
  onCreate: (from: string, to: string, kind: string, note: string) => void
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kind, setKind] = useState<string>(LINK_KINDS[0])
  const [note, setNote] = useState('')

  // FR-402 기준은 이 시나리오의 규칙에서, 연결 대상은 전체에서 고른다.
  const targets = useMemo(() => allRules.filter((r) => r.id !== from), [allRules, from])
  const ready = from !== '' && to !== ''

  return (
    <form
      className="link-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready) return
        onCreate(from, to, kind, note)
        setNote('')
      }}
    >
      <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="기준 규칙">
        <option value="">기준 규칙…</option>
        {ownRules.map((r) => (
          <option key={r.id} value={r.id}>
            {r.id} · {r.statement.slice(0, 24)}
          </option>
        ))}
      </select>

      <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="관계 종류">
        {LINK_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>

      <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="연결 규칙">
        <option value="">연결 규칙…</option>
        {targets.map((r) => (
          <option key={r.id} value={r.id}>
            {r.id} · {r.statement.slice(0, 24)}
          </option>
        ))}
      </select>

      <input
        placeholder="왜 그렇게 판단했는지"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button type="submit" className="primary" disabled={!ready || pending}>
        관계 만들기
      </button>

      {error !== null && <span className="form-error">{error}</span>}
    </form>
  )
}

function NoteForm({ pending, onAdd }: { pending: boolean; onAdd: (note: string) => void }) {
  const [note, setNote] = useState('')

  return (
    <form
      className="note-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (note.trim() === '') return
        onAdd(note.trim())
        setNote('')
      }}
    >
      <input
        placeholder="결정 사항이나 질문을 남긴다"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button type="submit" className="primary" disabled={note.trim() === '' || pending}>
        메모 남기기
      </button>
    </form>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="count">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
