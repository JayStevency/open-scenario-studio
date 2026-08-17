/**
 * BR 시트가 실제로 그려지고 편집이 서버로 나가는지 본다.
 * tRPC 만 가짜로 두고 컴포넌트는 진짜를 쓴다 — 표가 안 그려지면 여기서 걸린다.
 */
// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rules = [
  {
    id: 'SC-1.1',
    projectId: 'default',
    scenarioId: 'SC-1',
    statement: '선택한 상품을 장바구니에 담는다',
    ruleType: '상태',
    owner: '클라이언트',
    capabilityId: 'CAP-02',
    status: '확정',
    openIssue: null,
    orderIndex: 0,
    version: 3,
  },
  {
    id: 'SC-1.2',
    projectId: 'default',
    scenarioId: 'SC-1',
    statement: '수량은 재고를 넘을 수 없다',
    ruleType: '판단/제약',
    owner: null, // FR-106 경고 대상
    capabilityId: null, // FR-106 경고 대상
    status: '초안',
    openIssue: null,
    orderIndex: 1,
    version: 1,
  },
]

const options = {
  ruleType: ['상태', '판단/제약'],
  owner: ['클라이언트', '서버'],
  status: ['초안', '확정'],
  scenarios: [
    { id: 'SC-1', name: '장바구니 담기' },
    { id: 'SC-2', name: '주문 접수' },
  ],
  capabilities: [{ id: 'CAP-02', name: '장바구니' }],
}

const updateSpy = vi.fn()

vi.mock('../api/trpc', () => {
  // 질의마다 캐시 키가 달라야 한다. 같으면 서로 덮어쓴다.
  const query = (key: string, data: unknown) => ({
    queryOptions: () => ({ queryKey: [key], queryFn: async () => data }),
    queryKey: () => [key],
  })
  return {
    queryClient: new QueryClient(),
    trpc: {
      rule: {
        list: query('rules', rules),
        update: { mutationOptions: (o: object) => ({ ...o, mutationFn: updateSpy }) },
        create: { mutationOptions: (o: object) => ({ ...o, mutationFn: vi.fn() }) },
        delete: { mutationOptions: (o: object) => ({ ...o, mutationFn: vi.fn() }) },
        assignCapability: { mutationOptions: (o: object) => ({ ...o, mutationFn: vi.fn() }) },
      },
      project: {
        options: query('options', options),
        integrity: query('integrity', []),
        checks: query('checks', []),
        data: query('data', null),
      },
    },
  }
})

const { RuleSheet } = await import('./RuleSheet')

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RuleSheet />
    </QueryClientProvider>,
  )
}

beforeEach(() => updateSpy.mockClear())
// 렌더가 테스트 사이에 남으면 같은 요소가 여러 개로 잡힌다.
afterEach(cleanup)

describe('BR 시트 (FR-100)', () => {
  it('규칙을 표로 그린다 (FR-101)', async () => {
    renderSheet()
    expect(await screen.findByDisplayValue('선택한 상품을 장바구니에 담는다')).toBeDefined()
    expect(screen.getByText('SC-1.1')).toBeDefined()
    expect(screen.getByText('SC-1.2')).toBeDefined()
  })

  it('표시 건수를 보여준다 (FR-105)', async () => {
    renderSheet()
    expect(await screen.findByText('2건')).toBeDefined()
  })

  it('검색하면 걸러지고 건수가 바뀐다 (FR-105)', async () => {
    renderSheet()
    await screen.findByText('2건')
    await userEvent.type(screen.getByPlaceholderText('규칙 문장 · ID 검색'), '재고')
    await waitFor(() => expect(screen.getByText('1 / 2건')).toBeDefined())
    expect(screen.queryByDisplayValue('선택한 상품을 장바구니에 담는다')).toBeNull()
  })

  it('담당 주체·기능 그룹이 비면 경고색으로 표시한다 (FR-106)', async () => {
    const { container } = renderSheet()
    await screen.findByText('SC-1.2')
    // 빈 값 두 개(담당 주체·기능 그룹)만 경고 표시가 붙는다
    expect(container.querySelectorAll('.cell-select.warn')).toHaveLength(2)
  })

  it('문장을 고치면 version 을 실어 서버로 보낸다 (FR-102, NFR-03)', async () => {
    renderSheet()
    const input = await screen.findByDisplayValue('수량은 재고를 넘을 수 없다')
    await userEvent.clear(input)
    await userEvent.type(input, '수량은 재고를 넘을 수 없다. 초과 시 거절한다{Enter}')

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1))
    expect(updateSpy.mock.calls[0]?.[0]).toMatchObject({
      id: 'SC-1.2',
      version: 1,
      patch: { statement: '수량은 재고를 넘을 수 없다. 초과 시 거절한다' },
    })
  })

  it('값이 그대로면 저장하지 않는다', async () => {
    renderSheet()
    const input = await screen.findByDisplayValue('수량은 재고를 넘을 수 없다')
    await userEvent.click(input)
    await userEvent.tab()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('행마다 복제·삭제를 둔다 (FR-103)', async () => {
    renderSheet()
    await screen.findByText('SC-1.1')
    const rows = document.querySelectorAll('.row')
    expect(within(rows[0] as HTMLElement).getByText('복제')).toBeDefined()
    expect(within(rows[0] as HTMLElement).getByText('삭제')).toBeDefined()
  })
})
