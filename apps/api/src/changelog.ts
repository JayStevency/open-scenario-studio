/**
 * 변경 이력 적재(FR-406). 모든 쓰기 프로시저가 이 함수를 거친다.
 *
 * before 를 반드시 함께 남긴다 — 에이전트가 명세를 덮어쓸 수 있으므로
 * 원래 값이 여기 말고는 남는 곳이 없다(NFR-04).
 */
import type { Actor } from './trpc'

type Row = Record<string, unknown>

export interface ChangeInput {
  projectId: string
  actor: Actor
  entityType:
    | 'Scenario'
    | 'Rule'
    | 'ScenarioRelation'
    | 'RuleLink'
    | 'CapabilityGroup'
    | 'DevScenario'
  entityId: string
  action: 'create' | 'update' | 'delete'
  before?: Row | null
  after?: Row | null
}

/** patch 가 건드린 필드만 before 에서 골라낸다. 통째로 남기면 이력이 금세 불어난다. */
export function pickChanged(before: Row, patch: Row): Row {
  const picked: Row = {}
  for (const key of Object.keys(patch)) {
    picked[key] = before[key] ?? null
  }
  return picked
}

/** ChangeLog.create 에 넣을 데이터. 트랜잭션 안에서 호출한다. */
export function changeLogData(input: ChangeInput) {
  return {
    projectId: input.projectId,
    actorType: input.actor.type,
    actorLabel: input.actor.label,
    authorId: input.actor.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    before: (input.before ?? null) as never,
    after: (input.after ?? null) as never,
  }
}
