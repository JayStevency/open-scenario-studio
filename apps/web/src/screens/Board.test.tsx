// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rule = (id: string, scenarioId: string, capabilityId: string | null) => ({
  id,
  statement: `${id} 문장`,
  scenarioId,
  version: 1,
  capabilityId,
})

const board = {
  devScenarios: [
    { id: 'DEV-A', name: '주문 엔진' },
    { id: 'DEV-B', name: '결제 연동' },
  ],
  capabilities: [
    { id: 'CAP-01', devId: 'DEV-A', name: '상품 검색', description: '조회와 정렬' },
    // 세 시나리오에 걸친다 — 공통 모듈 후보
    { id: 'CAP-02', devId: 'DEV-A', name: '공통 처리', description: '' },
    { id: 'CAP-05', devId: 'DEV-B', name: '결제 승인', description: '' },
  ],
  rules: [
    rule('SC-0.1', 'SC-0', 'CAP-01'),
    rule('SC-0.2', 'SC-0', 'CAP-01'),
    rule('SC-1.1', 'SC-1', 'CAP-02'),
    rule('SC-2.1', 'SC-2', 'CAP-02'),
    rule('SC-3.1', 'SC-3', 'CAP-02'),
    rule('SC-3.2', 'SC-3', 'CAP-05'),
    rule('SC-9.1', 'SC-9', null), // 미배정
  ],
  scenarios: [
    { id: 'SC-0', name: '탐색' },
    { id: 'SC-1', name: '장바구니' },
    { id: 'SC-2', name: '주문' },
    { id: 'SC-3', name: '결제' },
    { id: 'SC-9', name: '기타' },
  ],
}

const assign = vi.fn()

vi.mock('../api/trpc', () => ({
  queryClient: new QueryClient(),
  trpc: {
    board: {
      queryOptions: () => ({ queryKey: ['board'], queryFn: async () => board }),
      queryKey: () => ['board'],
    },
    rule: { assignCapability: { mutationOptions: (o: object) => ({ ...o, mutationFn: assign }) } },
  },
}))

const { Board } = await import('./Board')

function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <Board />
    </QueryClientProvider>,
  )
}

beforeEach(() => assign.mockClear())
afterEach(cleanup)

describe('CAP · DEV 편성 보드 (FR-300)', () => {
  it('개발 시나리오를 열로, 기능 그룹을 카드로 놓는다 (FR-301)', async () => {
    const { container } = renderBoard()
    expect(await screen.findByText('주문 엔진')).toBeDefined()
    expect(screen.getByText('결제 연동')).toBeDefined()
    expect(container.querySelectorAll('.dev-column')).toHaveLength(2)
    expect(container.querySelectorAll('.cap-card')).toHaveLength(3)
  })

  it('규칙을 칩으로 배치한다 (FR-301)', async () => {
    const { container } = renderBoard()
    await screen.findByText('상품 검색')
    // 규칙 7건이 모두 어딘가에 칩으로 놓인다
    expect(container.querySelectorAll('.chip')).toHaveLength(7)
  })

  it('개발 시나리오마다 기능 그룹 수와 규칙 수를 보여준다 (FR-306)', async () => {
    renderBoard()
    await screen.findByText('주문 엔진')
    // DEV-A: CAP 2개, 규칙 5건 / DEV-B: CAP 1개, 규칙 1건
    expect(screen.getByText('기능 그룹 2 · 규칙 5')).toBeDefined()
    expect(screen.getByText('기능 그룹 1 · 규칙 1')).toBeDefined()
  })

  it('3개 이상 시나리오에 걸친 기능 그룹을 공통 모듈 후보로 강조한다 (FR-304)', async () => {
    const { container } = renderBoard()
    await screen.findByText('공통 처리')

    expect(screen.getByText('· 공통 모듈 후보')).toBeDefined()
    const shared = container.querySelectorAll('.cap-card.shared')
    expect(shared).toHaveLength(1)
    expect(within(shared[0] as HTMLElement).getByText('공통 처리')).toBeDefined()

    // CAP-01·CAP-05 는 한 시나리오뿐이라 강조하지 않는다
    expect(screen.getAllByText('시나리오 1개에 걸침')).toHaveLength(2)
    expect(container.querySelectorAll('.cap-card:not(.shared)')).toHaveLength(2)
  })

  it('미배정 규칙을 위에 모아 보여준다 (FR-305)', async () => {
    const { container } = renderBoard()
    expect(await screen.findByText('미배정 규칙 1건')).toBeDefined()
    const zone = container.querySelector('.unassigned') as HTMLElement
    expect(within(zone).getByText('SC-9.1')).toBeDefined()
  })

  it('미배정이 없으면 그 영역을 숨긴다 (FR-305)', async () => {
    const all = board.rules
    board.rules = all.filter((r) => r.capabilityId !== null)
    const { container } = renderBoard()
    await screen.findByText('상품 검색')
    expect(container.querySelector('.unassigned')).toBeNull()
    board.rules = all
  })
})
