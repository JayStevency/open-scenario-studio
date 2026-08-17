import { warningCount } from '@oss/domain'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PROJECT_ID } from './api/project'
import { queryClient, trpc } from './api/trpc'
import { buildWorkbook, exportFileName } from './export/workbook'
import { Board } from './screens/Board'
import { Checks } from './screens/Checks'
import { Diagram } from './screens/Diagram'
import { RuleSheet } from './screens/RuleSheet'
import { ScenarioDetail } from './screens/ScenarioDetail'

/** FR-002 다섯 화면. 아직 만들지 않은 것은 자리만 잡아 둔다. */
const TABS = [
  { id: 'rules', label: 'BR 시트' },
  { id: 'diagram', label: '관계도 편집' },
  { id: 'board', label: 'CAP · DEV 편성' },
  { id: 'scenario', label: '시나리오 상세' },
  { id: 'checks', label: '검사' },
] as const

type TabId = (typeof TABS)[number]['id']

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Studio />
    </QueryClientProvider>
  )
}

function Studio() {
  const [tab, setTab] = useState<TabId>('rules')

  const project = useQuery(trpc.project.data.queryOptions({ projectId: PROJECT_ID }))
  const checks = useQuery(trpc.project.checks.queryOptions({ projectId: PROJECT_ID }))

  const data = project.data
  // FR-003 미해결 지적 건수. 정보는 세지 않는다.
  const warnings = checks.data === undefined ? 0 : warningCount(checks.data)

  return (
    <div className="app">
      <header className="header">
        <h1>시나리오 스튜디오</h1>
        {/* FR-001 시나리오·규칙·관계·기능 그룹 건수 */}
        <dl className="counts">
          <Count label="시나리오" value={data?.scenarios.length} />
          <Count label="규칙" value={data?.rules.length} />
          <Count label="관계" value={data?.relations.length} />
          <Count label="기능 그룹" value={data?.capabilities.length} />
        </dl>

        {/* FR-005 엑셀 내보내기 */}
        <ExportButton data={data} />
      </header>

      <nav className="tabs">
        {TABS.map((t) => {
          const ready = true
          return (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? 'active' : ''}
              disabled={!ready}
              title={ready ? undefined : '아직 만들지 않았다'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {/* FR-003 검사 탭에 미해결 지적 건수 */}
              {t.id === 'checks' && warnings > 0 && <span className="badge">{warnings}</span>}
            </button>
          )
        })}
      </nav>

      <main className="main">
        {tab === 'rules' ? (
          <RuleSheet />
        ) : tab === 'checks' ? (
          <Checks />
        ) : tab === 'scenario' ? (
          <ScenarioDetail />
        ) : tab === 'board' ? (
          <Board />
        ) : (
          <Diagram />
        )}
      </main>
    </div>
  )
}

function ExportButton({ data }: { data: ReturnType<typeof useQuery>['data'] }) {
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle')

  async function download() {
    if (data === undefined) return
    setState('working')
    try {
      const workbook = buildWorkbook(data as never, '시나리오 스튜디오')
      const buffer = await workbook.xlsx.writeBuffer()
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = exportFileName('시나리오 스튜디오', new Date())
      link.click()
      URL.revokeObjectURL(url)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  return (
    <button
      type="button"
      className="export"
      onClick={download}
      disabled={data === undefined || state === 'working'}
      title="규칙 · 관계 · 기능 그룹 · 개발 시나리오를 시트로 나눠 내보낸다"
    >
      {state === 'working' ? '만드는 중…' : state === 'error' ? '내보내기 실패' : '엑셀 내보내기'}
    </button>
  )
}

function Count({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="count">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  )
}
