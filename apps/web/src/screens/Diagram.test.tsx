// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const diagram = {
  scenarios: [
    { id: 'SC-0', name: '탐색', displayName: '탐색', area: '주문', x: 10, y: 20, version: 2 },
    {
      id: 'SC-1',
      name: '장바구니',
      displayName: '장바구니',
      area: '주문',
      x: null,
      y: null,
      version: 1,
    },
  ],
  relations: [
    {
      id: 'REL-001',
      fromId: 'SC-0',
      toId: 'SC-1',
      kind: '전환',
      condition: '상품을 담음',
      basisRuleId: 'SC-1.1',
      version: 1,
    },
    // FR-205 조건이 비었다
    {
      id: 'REL-007',
      fromId: 'SC-1',
      toId: 'SC-0',
      kind: '분기',
      condition: '',
      basisRuleId: null,
      version: 3,
    },
  ],
  rules: [
    { id: 'SC-1.1', scenarioId: 'SC-1', statement: '장바구니에 담는다' },
    { id: 'SC-1.2', scenarioId: 'SC-1', statement: '수량을 제한한다' },
    { id: 'SC-0.1', scenarioId: 'SC-0', statement: '상품을 조회한다' },
  ],
}

const updateRel = vi.fn()
const deleteRel = vi.fn()

// React Flow 는 캔버스 측정을 필요로 한다. 화면 로직만 보려고 얇게 대체한다.
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: ReactNode }) => <div data-testid="flow">{children}</div>,
  Background: () => null,
  Controls: () => null,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  addEdge: (c: unknown, e: unknown[]) => [...e, c],
  applyNodeChanges: (_: unknown, n: unknown) => n,
  applyEdgeChanges: (_: unknown, e: unknown) => e,
}))

vi.mock('../api/trpc', () => {
  const mutation = (fn: unknown) => ({ mutationOptions: (o: object) => ({ ...o, mutationFn: fn }) })
  return {
    queryClient: new QueryClient(),
    trpc: {
      diagram: {
        queryOptions: () => ({ queryKey: ['diagram'], queryFn: async () => diagram }),
        queryKey: () => ['diagram'],
      },
      scenarioEdit: { move: mutation(vi.fn()) },
      relation: {
        create: mutation(vi.fn()),
        update: mutation(updateRel),
        delete: mutation(deleteRel),
      },
    },
  }
})

const { Diagram } = await import('./Diagram')

function renderDiagram() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <Diagram />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  updateRel.mockClear()
  deleteRel.mockClear()
})
afterEach(cleanup)

describe('관계도 편집 (FR-200)', () => {
  it('관계를 목록으로도 제공한다 (FR-207)', async () => {
    renderDiagram()
    expect(await screen.findByText('관계 2건')).toBeDefined()
    expect(screen.getByText('탐색 → 장바구니')).toBeDefined()
    expect(screen.getByText('장바구니 → 탐색')).toBeDefined()
  })

  it('조건이 빈 관계를 경고로 표시한다 (FR-205)', async () => {
    const { container } = renderDiagram()
    await screen.findByText('관계 2건')
    const blank = container.querySelectorAll('.rel-cond.blank')
    expect(blank).toHaveLength(1)
    expect(blank[0]?.textContent).toBe('조건 없음')
  })

  it('관계를 고르면 종류·조건·근거 규칙을 고칠 수 있다 (FR-204)', async () => {
    renderDiagram()
    await userEvent.click(await screen.findByText('장바구니 → 탐색'))

    expect(screen.getByText('REL-007')).toBeDefined()
    expect(screen.getByDisplayValue('분기')).toBeDefined()
  })

  it('근거 규칙 선택지를 출발 시나리오의 규칙으로 한정한다 (FR-204)', async () => {
    renderDiagram()
    // REL-007 은 SC-1 에서 출발한다 → SC-1 규칙 2건 + 빈 항목
    await userEvent.click(await screen.findByText('장바구니 → 탐색'))
    const basis = screen.getByLabelText(/근거 규칙/)
    const options = [...basis.querySelectorAll('option')].map((o) => o.value)
    expect(options).toEqual(['', 'SC-1.1', 'SC-1.2'])
    expect(options).not.toContain('SC-0.1')
  })

  it('고친 내용을 version 과 함께 보낸다 (NFR-03)', async () => {
    renderDiagram()
    await userEvent.click(await screen.findByText('장바구니 → 탐색'))

    const condition = screen.getByPlaceholderText('언제 이 관계가 일어나는가')
    await userEvent.type(condition, '수량을 바꿈')
    await userEvent.click(screen.getByText('저장'))

    expect(updateRel.mock.calls[0]?.[0]).toMatchObject({
      id: 'REL-007',
      version: 3,
      patch: { kind: '분기', condition: '수량을 바꿈', basisRuleId: null },
    })
  })

  it('관계를 지운다 (FR-204)', async () => {
    renderDiagram()
    await userEvent.click(await screen.findByText('탐색 → 장바구니'))
    await userEvent.click(screen.getByText('관계 삭제'))
    expect(deleteRel.mock.calls[0]?.[0]).toMatchObject({ id: 'REL-001', version: 1 })
  })

  it('관계 종류 네 가지를 제공한다 (FR-201)', async () => {
    renderDiagram()
    await userEvent.click(await screen.findByText('탐색 → 장바구니'))
    const kind = screen.getByLabelText(/종류/)
    expect([...kind.querySelectorAll('option')].map((o) => o.value)).toEqual([
      '전환',
      '분기',
      '재실행',
      '준용',
    ])
  })

  it('선택한 관계를 목록에서 강조한다 (FR-207)', async () => {
    const { container } = renderDiagram()
    await userEvent.click(await screen.findByText('탐색 → 장바구니'))
    const active = container.querySelectorAll('.relation-list button.active')
    expect(active).toHaveLength(1)
    expect(within(active[0] as HTMLElement).getByText('탐색 → 장바구니')).toBeDefined()
  })
})
