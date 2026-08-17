/**
 * 화면이 쓰는 질의와 편집. 낙관적 잠금(NFR-03)의 클라이언트 쪽을 여기서 다룬다.
 *
 * 편집은 즉시 저장한다(FR-004). 별도 저장 버튼이 없으므로 실패를 사용자가
 * 알아챌 수 있어야 한다 — 충돌이면 다시 읽고 무엇이 어긋났는지 알린다.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TRPCClientError } from '@trpc/client'
import { useCallback, useState } from 'react'
import { trpc } from './trpc'

/** 프로젝트는 아직 고르는 화면이 없다. 서버·MCP 와 같은 기본값을 쓴다. */
export const PROJECT_ID = 'default'

const input = { projectId: PROJECT_ID }

export function useRules() {
  return useQuery(trpc.rule.list.queryOptions(input))
}

export function useOptions() {
  return useQuery(trpc.project.options.queryOptions(input))
}

export function useIntegrity() {
  return useQuery(trpc.project.integrity.queryOptions(input))
}

/** 저장 상태를 헤더에 보여주기 위한 것(FR-004). */
export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date; what: string }
  | { kind: 'error'; message: string }

function messageOf(error: unknown): string {
  if (error instanceof TRPCClientError) {
    return error.data?.code === 'CONFLICT'
      ? `${error.message} — 최신 내용을 다시 불러왔다`
      : error.message
  }
  return error instanceof Error ? error.message : String(error)
}

/**
 * 편집 뮤테이션 묶음. 성공하면 목록을 다시 읽는다.
 * 충돌도 다시 읽는다 — 남이 고친 최신 값을 보여줘야 하기 때문이다.
 */
export function useRuleEditing() {
  const queryClient = useQueryClient()
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' })

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.rule.list.queryKey(input) }),
      queryClient.invalidateQueries({ queryKey: trpc.project.integrity.queryKey(input) }),
      queryClient.invalidateQueries({ queryKey: trpc.project.options.queryKey(input) }),
    ])
  }, [queryClient])

  const settle = useCallback(
    (what: string) => ({
      onMutate: () => setSaveState({ kind: 'saving' }),
      onSuccess: async () => {
        await refresh()
        setSaveState({ kind: 'saved', at: new Date(), what })
      },
      onError: async (error: unknown) => {
        await refresh()
        setSaveState({ kind: 'error', message: messageOf(error) })
      },
    }),
    [refresh],
  )

  const update = useMutation(trpc.rule.update.mutationOptions(settle('규칙 수정')))
  const create = useMutation(trpc.rule.create.mutationOptions(settle('규칙 추가')))
  const remove = useMutation(trpc.rule.delete.mutationOptions(settle('규칙 삭제')))
  const assign = useMutation(trpc.rule.assignCapability.mutationOptions(settle('기능 그룹 배정')))

  return { saveState, update, create, remove, assign }
}
