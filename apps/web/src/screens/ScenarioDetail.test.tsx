// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 화면은 목록의 첫 시나리오를 기본으로 연다. 상세 목과 어긋나지 않게 SC-3 을 앞에 둔다.
const scenarios = [
  { id: 'SC-3', name: '결제', displayName: '결제', area: '결제' },
  { id: 'SC-1', name: '장바구니', displayName: '장바구니', area: '주문' },
]

const detail = {
  scenario: scenarios[0],
  rules: [
    {
      id: 'SC-3.1',
      statement: '승인을 요청한다',
      ruleType: '요청/명령',
      status: '확정',
      version: 1,
    },
    {
      id: 'SC-3.2',
      statement: '금액을 검증한다',
      ruleType: '판단/제약',
      status: '초안',
      version: 1,
    },
  ],
  incoming: [{ id: 'REL-003' }],
  outgoing: [{ id: 'REL-004' }, { id: 'REL-006' }],
  links: [
    // 기준이 이 시나리오 것
    { id: 'L-2', fromId: 'SC-3.1', toId: 'SC-3.2', kind: '예외', note: '실패 시', version: 1 },
    // 연결 대상만 이 시나리오 것 — FR-404 로 함께 보여야 한다
    { id: 'L-4', fromId: 'SC-2.3', toId: 'SC-3.2', kind: '데이터 의존', note: '', version: 1 },
  ],
}

const history = [
  {
    id: 2,
    at: '2026-08-17T10:00:00.000Z',
    actorType: 'AGENT',
    actorLabel: 'mcp-agent',
    entityType: 'RuleLink',
    entityId: 'L-4',
    action: 'create',
    note: null,
  },
  {
    id: 1,
    at: '2026-08-17T09:00:00.000Z',
    actorType: 'USER',
    actorLabel: null,
    entityType: 'Scenario',
    entityId: 'SC-3',
    action: 'note',
    note: '재시도 횟수를 정해야 한다',
  },
]

const createLink = vi.fn()
const deleteLink = vi.fn()
const addNote = vi.fn()

vi.mock('../api/trpc', () => {
  const query = (key: string, data: unknown) => ({
    queryOptions: () => ({ queryKey: [key], queryFn: async () => data }),
    queryKey: () => [key],
  })
  const mutation = (fn: unknown) => ({ mutationOptions: (o: object) => ({ ...o, mutationFn: fn }) })
  return {
    queryClient: new QueryClient(),
    trpc: {
      scenario: { list: query('sc', scenarios), detail: query('detail', detail) },
      rule: {
        list: query('rules', [
          ...detail.rules,
          {
            id: 'SC-2.3',
            statement: '최종 금액을 계산한다',
            ruleType: '계산',
            status: '확정',
            version: 1,
          },
        ]),
      },
      history: { list: query('history', history), addNote: mutation(addNote) },
      link: { create: mutation(createLink), delete: mutation(deleteLink) },
    },
  }
})

const { ScenarioDetail } = await import('./ScenarioDetail')

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ScenarioDetail />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  createLink.mockClear()
  deleteLink.mockClear()
  addNote.mockClear()
})
afterEach(cleanup)

describe('시나리오 상세 (FR-400)', () => {
  it('규칙 목록과 관계 요약을 보여준다 (FR-401)', async () => {
    renderDetail()
    expect(await screen.findByText('승인을 요청한다')).toBeDefined()
    expect(screen.getByText('금액을 검증한다')).toBeDefined()

    // 규칙 2 · 들어오는 1 · 나가는 2 · BR 간 2
    const counts = document.querySelectorAll('.detail-head .count dd')
    expect([...counts].map((c) => c.textContent)).toEqual(['2', '1', '2', '2'])
  })

  it('다른 시나리오에서 들어온 관계도 함께 보여준다 (FR-404)', async () => {
    const { container } = renderDetail()
    await screen.findByText('실패 시') // 관계 목록이 그려졌다는 신호

    // '데이터 의존' 은 관계 종류 선택지에도 있다. 목록 안에서만 찾는다.
    const list = within(container.querySelector('.link-list') as HTMLElement)
    // L-4 는 기준이 SC-2.3(남의 시나리오) 이지만 연결 대상이 이 시나리오라 보인다
    expect(list.getByText('SC-2.3')).toBeDefined()
    expect(list.getByText('데이터 의존')).toBeDefined()
  })

  it('내 시나리오 규칙을 눈에 띄게 표시한다', async () => {
    const { container } = renderDetail()
    await screen.findByText('실패 시')
    // SC-3.1, SC-3.2(L-2 양쪽), SC-3.2(L-4 대상) = 3개
    expect(container.querySelectorAll('.link-list code.own')).toHaveLength(3)
  })

  it('기준 규칙은 이 시나리오 것만, 연결 대상은 전체에서 고른다 (FR-402)', async () => {
    renderDetail()
    const from = await screen.findByLabelText('기준 규칙')
    const to = screen.getByLabelText('연결 규칙')

    // 기준: 이 시나리오 규칙 2개 + 빈 항목
    expect(from.querySelectorAll('option')).toHaveLength(3)
    // 연결: 전체 규칙 3개 + 빈 항목
    expect(to.querySelectorAll('option')).toHaveLength(4)
  })

  it('관계 종류 네 가지를 제공한다 (FR-403)', async () => {
    renderDetail()
    const kind = await screen.findByLabelText('관계 종류')
    expect([...kind.querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      '선행',
      '예외',
      '대체',
      '데이터 의존',
    ])
  })

  it('관계를 만들면 서버로 보낸다 (FR-402)', async () => {
    renderDetail()
    await userEvent.selectOptions(await screen.findByLabelText('기준 규칙'), 'SC-3.1')
    await userEvent.selectOptions(screen.getByLabelText('연결 규칙'), 'SC-2.3')
    await userEvent.selectOptions(screen.getByLabelText('관계 종류'), '대체')
    await userEvent.click(screen.getByText('관계 만들기'))

    expect(createLink).toHaveBeenCalledTimes(1)
    expect(createLink.mock.calls[0]?.[0]).toMatchObject({
      fromRuleId: 'SC-3.1',
      toRuleId: 'SC-2.3',
      kind: '대체',
    })
  })

  it('관계를 개별 해제한다 (FR-404)', async () => {
    renderDetail()
    const buttons = await screen.findAllByText('해제')
    await userEvent.click(buttons[0] as HTMLElement)
    expect(deleteLink.mock.calls[0]?.[0]).toMatchObject({ id: 'L-2', version: 1 })
  })

  it('자동 기록과 메모를 시간순으로 함께 본다 (FR-406, FR-407)', async () => {
    renderDetail()
    expect(await screen.findByText('재시도 횟수를 정해야 한다')).toBeDefined()
    expect(screen.getByText('RuleLink L-4 create')).toBeDefined()
    // 에이전트가 고친 것을 구분해서 보여준다
    expect(screen.getByText(/에이전트/)).toBeDefined()
  })

  it('메모를 남기면 서버로 보낸다 (FR-407)', async () => {
    renderDetail()
    const input = await screen.findByPlaceholderText('결정 사항이나 질문을 남긴다')
    await userEvent.type(input, '승인 흐름을 정해야 한다')
    await userEvent.click(screen.getByText('메모 남기기'))

    expect(addNote.mock.calls[0]?.[0]).toMatchObject({
      scenarioId: 'SC-3',
      note: '승인 흐름을 정해야 한다',
    })
  })
})
