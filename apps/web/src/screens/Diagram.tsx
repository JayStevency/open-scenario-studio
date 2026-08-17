/**
 * FR-200 관계도 편집.
 *
 * 시나리오를 노드로, 관계를 화살표로 그린다. 노드를 끌어 옮기면 위치가 저장되고,
 * 두 노드를 이어 관계를 만든다. 조건이 빈 관계는 경고색으로 표시한다.
 */
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  MarkerType,
  type Node,
  type NodeChange,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PROJECT_ID } from '../api/project'
import { trpc } from '../api/trpc'

/** FR-201 관계 종류를 선 모양으로 구분한다. */
const KIND_STYLE: Record<string, { strokeDasharray?: string; label: string }> = {
  전환: { label: '전환' },
  분기: { strokeDasharray: '6 4', label: '분기' },
  재실행: { strokeDasharray: '14 5', label: '재실행' },
  준용: { strokeDasharray: '2 4', label: '준용' },
}
const KINDS = Object.keys(KIND_STYLE)

interface DiagramData {
  scenarios: {
    id: string
    name: string
    displayName: string
    area: string
    x: number | null
    y: number | null
    version: number
  }[]
  relations: {
    id: string
    fromId: string
    toId: string
    kind: string
    condition: string | null
    basisRuleId: string | null
    version: number
  }[]
  rules: { id: string; scenarioId: string; statement: string }[]
}

/** 좌표가 없는 시나리오는 격자에 늘어놓는다. 끌어 옮기면 그때부터 저장된다. */
function fallbackPosition(index: number) {
  return { x: 60 + (index % 4) * 240, y: 60 + Math.floor(index / 4) * 150 }
}

export function Diagram() {
  const queryClient = useQueryClient()
  const input = { projectId: PROJECT_ID }
  const diagram = useQuery(trpc.diagram.queryOptions(input))
  const data = diagram.data as DiagramData | undefined

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.diagram.queryKey(input) })
  }, [queryClient, input])

  const onError = (e: unknown) => {
    setError(e instanceof Error ? e.message : String(e))
    void refresh()
  }
  const onOk = async () => {
    setError(null)
    await refresh()
  }

  const move = useMutation(trpc.scenarioEdit.move.mutationOptions({ onError }))
  const createRel = useMutation(trpc.relation.create.mutationOptions({ onSuccess: onOk, onError }))
  const updateRel = useMutation(trpc.relation.update.mutationOptions({ onSuccess: onOk, onError }))
  const deleteRel = useMutation(trpc.relation.delete.mutationOptions({ onSuccess: onOk, onError }))

  // 서버 데이터가 바뀌면 그림을 다시 세운다.
  useEffect(() => {
    if (data === undefined) return

    setNodes(
      data.scenarios.map((s, i) => ({
        id: s.id,
        position: s.x === null || s.y === null ? fallbackPosition(i) : { x: s.x, y: s.y },
        data: { label: `${s.id}\n${s.displayName}` },
        type: 'default',
        style: { whiteSpace: 'pre-line', fontSize: 12, width: 170 },
      })),
    )

    setEdges(
      data.relations.map((r) => {
        const style = KIND_STYLE[r.kind] ?? { label: r.kind }
        // FR-205 조건이 비어 있으면 경고색
        const blank = r.condition === null || r.condition.trim() === ''
        return {
          id: r.id,
          source: r.fromId,
          target: r.toId,
          label: blank ? `${style.label} · 조건 없음` : `${style.label} · ${r.condition}`,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: blank ? '#b45309' : '#6b7280',
            strokeWidth: blank ? 2 : 1.5,
            ...(style.strokeDasharray !== undefined && {
              strokeDasharray: style.strokeDasharray,
            }),
          },
          labelStyle: { fontSize: 10, fill: blank ? '#b45309' : '#374151' },
        }
      }),
    )
  }, [data])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((current) => applyNodeChanges(changes, current))

      // FR-202 끌어 옮긴 결과만 저장한다. 끄는 중에는 보내지 않는다.
      for (const change of changes) {
        if (change.type !== 'position' || change.dragging !== false) continue
        const scenario = data?.scenarios.find((s) => s.id === change.id)
        const position = change.position
        if (scenario === undefined || position === undefined) continue
        move.mutate({
          projectId: PROJECT_ID,
          id: scenario.id,
          version: scenario.version,
          x: Math.round(position.x),
          y: Math.round(position.y),
        })
      }
    },
    [data, move],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((current) => applyEdgeChanges(changes, current)),
    [],
  )

  /** FR-203 두 노드를 이으면 관계가 생기고 바로 조건을 적게 연다. */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === null || connection.target === null) return
      const id = `REL-${Date.now().toString(36)}`
      setEdges((current) => addEdge({ ...connection, id }, current))
      createRel.mutate({
        projectId: PROJECT_ID,
        id,
        fromScenarioId: connection.source,
        toScenarioId: connection.target,
        kind: KINDS[0] as string,
        condition: '',
      })
      setSelected(id)
    },
    [createRel],
  )

  if (diagram.isPending) return <p className="placeholder">불러오는 중…</p>
  if (diagram.isError) {
    return <p className="placeholder error">관계도를 불러오지 못했다: {diagram.error.message}</p>
  }
  if (data === undefined) return null

  const current = data.relations.find((r) => r.id === selected) ?? null

  return (
    <div className="diagram">
      <div className="canvas">
        {error !== null && <div className="notice diagram-error">{error}</div>}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_, edge) => setSelected(edge.id)}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      <aside className="diagram-side">
        <RelationList
          relations={data.relations}
          scenarios={data.scenarios}
          selected={selected}
          onSelect={setSelected}
        />

        {current !== null && (
          <RelationEditor
            key={current.id}
            relation={current}
            rules={data.rules.filter((r) => r.scenarioId === current.fromId)}
            pending={updateRel.isPending || deleteRel.isPending}
            onSave={(patch) =>
              updateRel.mutate({
                projectId: PROJECT_ID,
                id: current.id,
                version: current.version,
                patch,
              })
            }
            onDelete={() => {
              deleteRel.mutate({
                projectId: PROJECT_ID,
                id: current.id,
                version: current.version,
              })
              setSelected(null)
            }}
          />
        )}
      </aside>
    </div>
  )
}

/** FR-207 관계를 목록으로도 제공하고, 고르면 다이어그램에서 강조한다. */
function RelationList({
  relations,
  scenarios,
  selected,
  onSelect,
}: {
  relations: DiagramData['relations']
  scenarios: DiagramData['scenarios']
  selected: string | null
  onSelect: (id: string) => void
}) {
  const name = useMemo(() => new Map(scenarios.map((s) => [s.id, s.displayName])), [scenarios])

  return (
    <section className="panel">
      <h3>관계 {relations.length}건</h3>
      <ul className="relation-list">
        {relations.map((r) => {
          const blank = r.condition === null || r.condition.trim() === ''
          return (
            <li key={r.id}>
              <button
                type="button"
                className={r.id === selected ? 'active' : ''}
                onClick={() => onSelect(r.id)}
              >
                <span className="rel-flow">
                  {name.get(r.fromId) ?? r.fromId} → {name.get(r.toId) ?? r.toId}
                </span>
                <span className="rel-kind">{r.kind}</span>
                <span className={`rel-cond${blank ? ' blank' : ''}`}>
                  {blank ? '조건 없음' : r.condition}
                </span>
              </button>
            </li>
          )
        })}
        {relations.length === 0 && <li className="empty">관계가 없다.</li>}
      </ul>
    </section>
  )
}

/** FR-204 관계 종류·발생 조건·근거 규칙을 고치거나 관계를 지운다. */
function RelationEditor({
  relation,
  rules,
  pending,
  onSave,
  onDelete,
}: {
  relation: DiagramData['relations'][number]
  rules: DiagramData['rules']
  pending: boolean
  onSave: (patch: { kind?: string; condition?: string; basisRuleId?: string | null }) => void
  onDelete: () => void
}) {
  const [kind, setKind] = useState(relation.kind)
  const [condition, setCondition] = useState(relation.condition ?? '')
  const [basisRuleId, setBasis] = useState(relation.basisRuleId ?? '')

  return (
    <section className="panel">
      <h3>{relation.id}</h3>
      <form
        className="relation-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ kind, condition, basisRuleId: basisRuleId === '' ? null : basisRuleId })
        }}
      >
        <label>
          종류
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label>
          발생 조건
          <input
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="언제 이 관계가 일어나는가"
          />
        </label>

        <label>
          근거 규칙
          {/* FR-204 선택지는 출발 시나리오의 규칙으로 한정한다 */}
          <select value={basisRuleId} onChange={(e) => setBasis(e.target.value)}>
            <option value="">—</option>
            {rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.statement.slice(0, 20)}
              </option>
            ))}
          </select>
        </label>

        <div className="relation-actions">
          <button type="submit" className="primary" disabled={pending}>
            저장
          </button>
          <button type="button" onClick={onDelete} disabled={pending}>
            관계 삭제
          </button>
        </div>
      </form>
    </section>
  )
}
