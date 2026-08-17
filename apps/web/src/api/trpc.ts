/**
 * 서버 통신. 타입은 apps/api 의 라우터에서 그대로 따온다 — 스키마 중복이 없다.
 * 개발 중에는 vite 가 /trpc 를 API 로 프록시한다.
 */

import type { AppRouter } from '@oss/api/router'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 편집기라 화면 복귀마다 다시 받을 이유가 없다. 갱신은 mutation 이 무효화한다.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
      headers: () => {
        // 사내 인증 연동 전 임시. 붙으면 쿠키·토큰으로 바꾼다(NFR-06).
        const userId = localStorage.getItem('oss.userId')
        return userId === null ? {} : { 'x-user-id': userId }
      },
    }),
  ],
})

export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient })
