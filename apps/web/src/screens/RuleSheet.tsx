/**
 * FR-100 BR 시트 — 원본 데이터 관리. 우선순위 최상.
 *
 * 표 안에서 바로 고친다(FR-102). 별도 상세 화면으로 가지 않는다.
 * 규칙 1,000건에서도 버텨야 하므로 보이는 행만 그린다(NFR-01).
 */
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'
import { PROJECT_ID, useOptions, useRuleEditing, useRules } from '../api/project'
import { EditableCell, SelectCell } from '../components/Cell'

const ROW_HEIGHT = 38

interface Filters {
  q: string
  scenarioId: string
  ruleType: string
}

export function RuleSheet() {
  const rules = useRules()
  const options = useOptions()
  const { saveState, update, create, remove, assign } = useRuleEditing()

  // 필터는 화면을 떠나도 세션 동안 유지된다(FR-002) — 상위에서 들고 있지 않고
  // 탭이 언마운트되지 않게 App 이 감춘다.
  const [filters, setFilters] = useState<Filters>({ q: '', scenarioId: '', ruleType: '' })
  const [notice, setNotice] = useState<string | null>(null)

  const all = useMemo(() => rules.data ?? [], [rules.data])
  const scenarioName = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of options.data?.scenarios ?? []) map.set(s.id, s.name)
    return map
  }, [options.data])

  // FR-105 규칙 문장 검색과 시나리오·유형 필터를 조합해 거른다.
  const shown = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    return all.filter((r) => {
      if (filters.scenarioId !== '' && r.scenarioId !== filters.scenarioId) return false
      if (filters.ruleType !== '' && r.ruleType !== filters.ruleType) return false
      if (q === '') return true
      return r.statement.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    })
  }, [all, filters])

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: shown.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    // 컨테이너를 재기 전에도 첫 화면을 그린다. 실제 크기는 관측되면 대체된다.
    initialRect: { width: 1280, height: 720 },
  })

  const busy = update.isPending || create.isPending || remove.isPending || assign.isPending

  function edit(id: string, version: number, patch: Record<string, string>) {
    update.mutate({ projectId: PROJECT_ID, id, version, patch })
  }

  function addRule(copyOfId?: string) {
    // FR-103 추가 시 현재 필터의 시나리오를 기본값으로 넣는다.
    const scenarioId =
      filters.scenarioId !== '' ? filters.scenarioId : (options.data?.scenarios[0]?.id ?? '')
    if (scenarioId === '') return
    create.mutate(
      copyOfId === undefined
        ? { projectId: PROJECT_ID, scenarioId }
        : { projectId: PROJECT_ID, scenarioId, copyOfId },
    )
  }

  function deleteRule(id: string, version: number) {
    // FR-108 무엇이 함께 지워지는지 알린다.
    remove.mutate(
      { projectId: PROJECT_ID, id, version },
      {
        onSuccess: (result) => {
          const parts: string[] = []
          if (result.deletedLinkIds.length > 0) {
            parts.push(`BR 간 관계 ${result.deletedLinkIds.length}건이 함께 지워졌다`)
          }
          if (result.clearedRelationIds.length > 0) {
            parts.push(`시나리오 관계 ${result.clearedRelationIds.length}건의 근거 지정이 풀렸다`)
          }
          setNotice(
            parts.length === 0 ? `${id} 를 지웠다` : `${id} 를 지웠다 — ${parts.join(', ')}`,
          )
        },
      },
    )
  }

  if (rules.isPending || options.isPending) {
    return <p className="placeholder">불러오는 중…</p>
  }

  if (rules.isError) {
    return (
      <p className="placeholder error">
        규칙을 불러오지 못했다: {rules.error.message}
        <br />
        서버가 떠 있는지, DB 에 데이터를 넣었는지 확인해라 — <code>pnpm db:seed:sample</code>
      </p>
    )
  }

  const opts = options.data
  if (opts === undefined) {
    return <p className="placeholder">선택 목록을 불러오지 못했다.</p>
  }

  if (all.length === 0) {
    return (
      <p className="placeholder">
        규칙이 없다. <code>pnpm db:seed:sample</code> 로 예제를 넣거나 아래에서 직접 추가해라.
        <br />
        <button type="button" className="primary" onClick={() => addRule()}>
          규칙 추가
        </button>
      </p>
    )
  }

  return (
    <div className="sheet">
      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="규칙 문장 · ID 검색"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />

        <select
          value={filters.scenarioId}
          onChange={(e) => setFilters((f) => ({ ...f, scenarioId: e.target.value }))}
        >
          <option value="">시나리오 전체</option>
          {opts.scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} · {s.name}
            </option>
          ))}
        </select>

        <select
          value={filters.ruleType}
          onChange={(e) => setFilters((f) => ({ ...f, ruleType: e.target.value }))}
        >
          <option value="">유형 전체</option>
          {opts.ruleType.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* FR-105 표시 건수 */}
        <span className="count-badge">
          {shown.length === all.length ? `${all.length}건` : `${shown.length} / ${all.length}건`}
        </span>

        <button type="button" className="primary" onClick={() => addRule()} disabled={busy}>
          규칙 추가
        </button>

        <SaveIndicator state={saveState} />
      </div>

      {notice !== null && (
        <div className="notice">
          {notice}
          <button type="button" onClick={() => setNotice(null)}>
            닫기
          </button>
        </div>
      )}

      <div className="table-head">
        <span className="col-id">BR ID</span>
        <span className="col-sc">시나리오</span>
        <span className="col-type">유형</span>
        <span className="col-stmt">규칙 문장</span>
        <span className="col-owner">담당 주체</span>
        <span className="col-cap">기능 그룹</span>
        <span className="col-status">상태</span>
        <span className="col-actions" />
      </div>

      <div ref={scrollRef} className="table-body">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((item) => {
            const rule = shown[item.index]
            if (rule === undefined) return null
            return (
              <div
                key={rule.id}
                className="row"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: item.size,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <span className="col-id" title={rule.id}>
                  {rule.id}
                </span>

                {/* FR-104 시나리오를 바꾸면 규칙이 그 시나리오로 옮겨간다 */}
                <SelectCell
                  className="col-sc"
                  value={rule.scenarioId}
                  options={opts.scenarios.map((s) => ({
                    value: s.id,
                    label: `${s.id} · ${scenarioName.get(s.id) ?? ''}`,
                  }))}
                  onChange={(v) => edit(rule.id, rule.version, { scenarioId: v })}
                />

                <SelectCell
                  className="col-type"
                  value={rule.ruleType}
                  options={opts.ruleType.map((t) => ({ value: t, label: t }))}
                  allowEmpty
                  onChange={(v) => edit(rule.id, rule.version, { ruleType: v })}
                />

                <EditableCell
                  className="col-stmt"
                  value={rule.statement}
                  onCommit={(v) => edit(rule.id, rule.version, { statement: v })}
                />

                {/* FR-106 비어 있으면 경고색 */}
                <SelectCell
                  className="col-owner"
                  value={rule.owner ?? ''}
                  options={opts.owner.map((o) => ({ value: o, label: o }))}
                  allowEmpty
                  warnWhenEmpty
                  onChange={(v) => edit(rule.id, rule.version, { owner: v })}
                />

                <SelectCell
                  className="col-cap"
                  value={rule.capabilityId ?? ''}
                  options={opts.capabilities.map((c) => ({
                    value: c.id,
                    label: `${c.id} · ${c.name}`,
                  }))}
                  allowEmpty
                  warnWhenEmpty
                  onChange={(v) =>
                    assign.mutate({
                      projectId: PROJECT_ID,
                      id: rule.id,
                      version: rule.version,
                      capabilityId: v === '' ? null : v,
                    })
                  }
                />

                <SelectCell
                  className="col-status"
                  value={rule.status}
                  options={opts.status.map((s) => ({ value: s, label: s }))}
                  allowEmpty
                  onChange={(v) => edit(rule.id, rule.version, { status: v })}
                />

                <span className="col-actions">
                  <button
                    type="button"
                    title="복제 — 원본 바로 아래에 초안으로 만든다"
                    onClick={() => addRule(rule.id)}
                    disabled={busy}
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    title="삭제 — 참조하는 관계도 함께 정리된다"
                    onClick={() => deleteRule(rule.id, rule.version)}
                    disabled={busy}
                  >
                    삭제
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SaveIndicator({ state }: { state: ReturnType<typeof useRuleEditing>['saveState'] }) {
  if (state.kind === 'idle') return null
  if (state.kind === 'saving') return <span className="save saving">저장 중…</span>
  if (state.kind === 'error') return <span className="save error">{state.message}</span>
  return (
    <span className="save saved">
      {state.what} 저장됨 {state.at.toLocaleTimeString('ko-KR')}
    </span>
  )
}
