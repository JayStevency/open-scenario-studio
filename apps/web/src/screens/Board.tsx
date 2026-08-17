/**
 * FR-300 CAP · DEV 편성 보드.
 *
 * 개발 시나리오를 열로, 기능 그룹을 카드로, 규칙을 칩으로 놓는다.
 * 칩을 끌어 다른 기능 그룹으로 옮기거나 미배정으로 되돌린다.
 *
 * 여기서 사람이 나눈 단위가 곧 에이전트에게 던지는 작업 단위가 된다.
 */
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { PROJECT_ID } from '../api/project'
import { trpc } from '../api/trpc'

/** FR-304 공통 모듈 후보로 강조하는 기준. */
const SHARED_SCENARIO_THRESHOLD = 3

/** 미배정 영역의 드롭 대상 id. */
const UNASSIGNED = '__unassigned__'

interface RuleChip {
  id: string
  statement: string
  scenarioId: string
  version: number
  capabilityId: string | null
}

/**
 * 라우터 추론 타입을 그대로 쓰면 인스턴스화가 너무 깊어져 타입 검사가 포기한다.
 * 화면이 쓰는 만큼만 적어 끊는다.
 */
interface BoardData {
  devScenarios: { id: string; name: string }[]
  capabilities: { id: string; devId: string; name: string; description: string | null }[]
  rules: RuleChip[]
  scenarios: { id: string; name: string }[]
}

/** 질의 입력. 컴포넌트 밖에 두어 매 렌더 새 객체가 되지 않게 한다. */
const QUERY_INPUT = { projectId: PROJECT_ID }

export function Board() {
  const queryClient = useQueryClient()
  const board = useQuery(trpc.board.queryOptions(QUERY_INPUT))
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.board.queryKey(QUERY_INPUT) })
  }

  const assign = useMutation(
    trpc.rule.assignCapability.mutationOptions({
      onSuccess: async () => {
        setError(null)
        await refresh()
      },
      onError: async (e: unknown) => {
        setError(e instanceof Error ? e.message : String(e))
        await refresh()
      },
    }),
  )

  const sensors = useSensors(
    // 클릭과 구분되게 조금 끌어야 시작한다.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const data = board.data as BoardData | undefined
  const rulesByCapability = useMemo(() => {
    const map = new Map<string, RuleChip[]>()
    for (const rule of data?.rules ?? []) {
      const key = rule.capabilityId ?? UNASSIGNED
      const list = map.get(key) ?? []
      list.push(rule)
      map.set(key, list)
    }
    return map
  }, [data])

  if (board.isPending) return <p className="placeholder">불러오는 중…</p>
  if (board.isError) {
    return <p className="placeholder error">편성을 불러오지 못했다: {board.error.message}</p>
  }
  if (data === undefined) return null

  const scenarioName = new Map(data.scenarios.map((s) => [s.id, s.name]))
  const unassigned = rulesByCapability.get(UNASSIGNED) ?? []

  function onDragEnd(event: DragEndEvent) {
    const ruleId = String(event.active.id)
    const target = event.over === null ? null : String(event.over.id)
    if (target === null) return

    const rule = (data?.rules ?? []).find((r) => r.id === ruleId)
    if (rule === undefined) return

    const capabilityId = target === UNASSIGNED ? null : target
    if (rule.capabilityId === capabilityId) return

    assign.mutate({
      projectId: PROJECT_ID,
      id: ruleId,
      version: rule.version,
      capabilityId,
    })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="board">
        {error !== null && <div className="notice">{error}</div>}

        {/* FR-305 미배정 규칙이 있으면 위에 모아 보여주고, 없으면 이 영역을 숨긴다 */}
        {unassigned.length > 0 && <UnassignedZone rules={unassigned} scenarioName={scenarioName} />}

        <div className="board-columns">
          {data.devScenarios.map((dev) => {
            const caps = data.capabilities.filter((c) => c.devId === dev.id)
            const ruleCount = caps.reduce(
              (sum, c) => sum + (rulesByCapability.get(c.id)?.length ?? 0),
              0,
            )

            return (
              <section key={dev.id} className="dev-column">
                <header>
                  <h3>
                    <span className="sc-id">{dev.id}</span> {dev.name}
                  </h3>
                  {/* FR-306 개발 시나리오마다 기능 그룹 수와 규칙 수 */}
                  <p className="dev-meta">
                    기능 그룹 {caps.length} · 규칙 {ruleCount}
                  </p>
                </header>

                {caps.map((cap) => (
                  <CapabilityCard
                    key={cap.id}
                    id={cap.id}
                    name={cap.name}
                    description={cap.description ?? ''}
                    rules={rulesByCapability.get(cap.id) ?? []}
                    scenarioName={scenarioName}
                  />
                ))}

                {caps.length === 0 && <p className="empty">기능 그룹이 없다.</p>}
              </section>
            )
          })}
        </div>
      </div>
    </DndContext>
  )
}

function UnassignedZone({
  rules,
  scenarioName,
}: {
  rules: RuleChip[]
  scenarioName: Map<string, string>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED })

  return (
    <section ref={setNodeRef} className={`unassigned${isOver ? ' over' : ''}`}>
      <h3>미배정 규칙 {rules.length}건</h3>
      <div className="chips">
        {rules.map((r) => (
          <Chip key={r.id} rule={r} scenarioName={scenarioName} />
        ))}
      </div>
    </section>
  )
}

function CapabilityCard({
  id,
  name,
  description,
  rules,
  scenarioName,
}: {
  id: string
  name: string
  description: string
  rules: RuleChip[]
  scenarioName: Map<string, string>
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  // FR-304 걸쳐 있는 시나리오 수. 많으면 공통 모듈 후보다.
  const scenarioCount = new Set(rules.map((r) => r.scenarioId)).size
  const shared = scenarioCount >= SHARED_SCENARIO_THRESHOLD

  return (
    <article
      ref={setNodeRef}
      className={`cap-card${isOver ? ' over' : ''}${shared ? ' shared' : ''}`}
    >
      <header>
        <span className="cap-id">{id}</span>
        <span className="cap-name">{name}</span>
        <span className="cap-count">규칙 {rules.length}</span>
      </header>

      {description !== '' && <p className="cap-desc">{description}</p>}

      <p className="cap-spread">
        시나리오 {scenarioCount}개에 걸침
        {shared && <strong> · 공통 모듈 후보</strong>}
      </p>

      <div className="chips">
        {rules.map((r) => (
          <Chip key={r.id} rule={r} scenarioName={scenarioName} />
        ))}
        {rules.length === 0 && <span className="empty">규칙을 끌어다 놓아라.</span>}
      </div>
    </article>
  )
}

function Chip({ rule, scenarioName }: { rule: RuleChip; scenarioName: Map<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: rule.id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`chip${isDragging ? ' dragging' : ''}`}
      title={`${rule.id} · ${scenarioName.get(rule.scenarioId) ?? rule.scenarioId}\n${rule.statement}`}
      style={
        transform === null
          ? undefined
          : { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      }
      {...listeners}
      {...attributes}
    >
      <span className="chip-id">{rule.id}</span>
      <span className="chip-text">{rule.statement}</span>
    </button>
  )
}
