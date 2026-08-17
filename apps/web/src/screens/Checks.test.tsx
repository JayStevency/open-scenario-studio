// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const checks = [
  { code: 'FR-501', label: '담당 주체 미지정', severity: '경고', targetIds: ['a', 'b', 'c'] },
  {
    code: 'FR-502',
    label: '기능 그룹 미배정 규칙',
    severity: '경고',
    // 6건을 넘겨 접기가 동작하는지 본다
    targetIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'],
  },
  { code: 'FR-506', label: '한쪽 흐름만 있는 시나리오', severity: '정보', targetIds: ['SC-9'] },
  { code: 'FR-508', label: '검토 필요 상태', severity: '경고', targetIds: [] },
]

vi.mock('../api/trpc', () => ({
  queryClient: new QueryClient(),
  trpc: {
    project: {
      checks: {
        queryOptions: () => ({ queryKey: ['checks'], queryFn: async () => checks }),
        queryKey: () => ['checks'],
      },
    },
  },
}))

const { Checks } = await import('./Checks')

function renderChecks() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <Checks />
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe('정합성 검사 화면 (FR-500)', () => {
  it('항목마다 지적 건수를 보여준다', async () => {
    renderChecks()
    expect(await screen.findByText('담당 주체 미지정')).toBeDefined()
    expect(screen.getByText('3건')).toBeDefined()
    expect(screen.getByText('8건')).toBeDefined()
  })

  it('지적이 없는 항목도 남기고 없음으로 적는다', async () => {
    renderChecks()
    expect(await screen.findByText('검토 필요 상태')).toBeDefined()
    expect(screen.getByText('없음')).toBeDefined()
  })

  it('경고 건수만 합산한다 — 정보는 빼고 (FR-003)', async () => {
    renderChecks()
    // 경고 3 + 8 + 0 = 11. 정보 1건(SC-9)은 세지 않는다.
    expect(await screen.findByText('11건')).toBeDefined()
  })

  it('목록이 길면 앞 6건만 적고 나머지는 접는다', async () => {
    renderChecks()
    await screen.findByText('기능 그룹 미배정 규칙')
    expect(screen.getByText('r6')).toBeDefined()
    expect(screen.queryByText('r7')).toBeNull()

    await userEvent.click(screen.getByText('외 2건'))
    expect(screen.getByText('r7')).toBeDefined()
    expect(screen.getByText('r8')).toBeDefined()

    await userEvent.click(screen.getByText('접기'))
    expect(screen.queryByText('r7')).toBeNull()
  })

  it('경고와 정보를 구분해 표시한다', async () => {
    const { container } = renderChecks()
    await screen.findByText('담당 주체 미지정')
    expect(container.querySelectorAll('.sev-warn')).toHaveLength(3)
    expect(container.querySelectorAll('.sev-info')).toHaveLength(1)
  })
})
