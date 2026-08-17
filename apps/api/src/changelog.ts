/**
 * 변경 이력 적재(FR-406). 모든 쓰기 프로시저가 이 함수를 거친다.
 *
 * before 를 반드시 함께 남긴다 — 에이전트가 명세를 덮어쓸 수 있으므로
 * 원래 값이 여기 말고는 남는 곳이 없다(NFR-04).
 */
import type { Actor } from './trpc'

/**
 * 이력의 작성자로 걸 수 있는 사용자 ID.
 *
 * 사내 인증(NFR-06)이 붙기 전에는 헤더로 신원을 흉내 내므로, 그 값이
 * 실제 사용자 행이 아닐 수 있다. 없는 사용자를 걸면 외래키 위반으로
 * 저장 자체가 실패하니, 확인된 경우에만 건다 — 누가 고쳤는지는
 * actorLabel 로 남는다.
 */
export async function resolveAuthorId(
  tx: {
    user: {
      findUnique: (args: {
        where: { id: string }
        select: { id: true }
      }) => Promise<{ id: string } | null>
    }
  },
  actor: Actor,
): Promise<string | null> {
  if (actor.userId === null) return null
  const found = await tx.user.findUnique({ where: { id: actor.userId }, select: { id: true } })
  return found?.id ?? null
}

type Row = Record<string, unknown>

export interface ChangeInput {
  projectId: string
  actor: Actor
  /** resolveAuthorId 로 확인된 값. 없으면 사람 이름은 actorLabel 에만 남는다. */
  authorId?: string | null
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
    actorLabel: input.actor.label ?? input.actor.userId,
    authorId: input.authorId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    before: (input.before ?? null) as never,
    after: (input.after ?? null) as never,
  }
}
