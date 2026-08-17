/**
 * 낙관적 잠금 — 마지막 저장이 앞선 저장을 조용히 덮어쓰지 않게 한다(NFR-03).
 *
 * 클라이언트는 자기가 읽은 version 을 함께 보낸다. 그 사이 남이 고쳤으면
 * version 이 올라가 있고, 갱신은 0건이 되어 CONFLICT 로 되돌아간다.
 */
import { TRPCError } from '@trpc/server'

export class VersionConflictError extends Error {
  constructor(
    readonly entityType: string,
    readonly entityId: string,
    readonly expectedVersion: number,
    readonly actualVersion: number | null,
  ) {
    super(
      actualVersion === null
        ? `${entityType} ${entityId} 가 이미 삭제됐다`
        : `${entityType} ${entityId} 를 다른 사용자가 먼저 고쳤다 (내 버전 ${expectedVersion}, 현재 ${actualVersion})`,
    )
    this.name = 'VersionConflictError'
  }
}

/** 갱신 결과 0건을 충돌로 판정한다. */
export function assertUpdated(
  updatedCount: number,
  entityType: string,
  entityId: string,
  expectedVersion: number,
  actualVersion: number | null,
): void {
  if (updatedCount === 0) {
    throw new VersionConflictError(entityType, entityId, expectedVersion, actualVersion)
  }
}

/** 도메인 오류를 tRPC 오류로. 클라이언트는 CONFLICT 를 보고 사용자에게 알린다. */
export function toTrpcError(error: unknown): TRPCError {
  if (error instanceof VersionConflictError) {
    return new TRPCError({ code: 'CONFLICT', message: error.message, cause: error })
  }
  return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error })
}
