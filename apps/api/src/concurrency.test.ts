import { describe, expect, it } from 'vitest'
import { assertUpdated, toTrpcError, VersionConflictError } from './concurrency'

describe('낙관적 잠금 (NFR-03)', () => {
  it('갱신 1건이면 통과한다', () => {
    expect(() => assertUpdated(1, 'Rule', 'SC-0.1', 3, 3)).not.toThrow()
  })

  it('남이 먼저 고쳤으면 현재 버전을 담아 던진다', () => {
    expect(() => assertUpdated(0, 'Rule', 'SC-0.1', 3, 5)).toThrow(VersionConflictError)

    try {
      assertUpdated(0, 'Rule', 'SC-0.1', 3, 5)
      expect.unreachable('충돌이 던져져야 한다')
    } catch (error) {
      expect(error).toBeInstanceOf(VersionConflictError)
      const conflict = error as VersionConflictError
      expect(conflict.actualVersion).toBe(5)
      expect(conflict.message).toContain('내 버전 3')
      expect(conflict.message).toContain('현재 5')
    }
  })

  it('대상이 사라졌으면 삭제됐다고 알린다', () => {
    expect(() => assertUpdated(0, 'Rule', 'SC-0.1', 3, null)).toThrow(/삭제됐다/)
  })

  it('충돌은 CONFLICT 로 나간다 — 클라이언트가 사용자에게 알릴 수 있게', () => {
    expect(toTrpcError(new VersionConflictError('Rule', 'SC-0.1', 3, 5)).code).toBe('CONFLICT')
  })

  it('그 밖의 오류는 내부 오류로 감춘다', () => {
    expect(toTrpcError(new Error('연결 끊김')).code).toBe('INTERNAL_SERVER_ERROR')
  })
})
