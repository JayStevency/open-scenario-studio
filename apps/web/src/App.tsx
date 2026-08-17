import { warningCount } from '@oss/domain'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PROJECT_ID } from './api/project'
import { queryClient, trpc } from './api/trpc'
import { Checks } from './screens/Checks'
import { RuleSheet } from './screens/RuleSheet'

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
      </header>

      <nav className="tabs">
        {TABS.map((t) => {
          const ready = t.id === 'rules' || t.id === 'checks'
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
        ) : (
          <p className="placeholder">
            이 화면은 아직 만들지 않았다. <code>design/prototype.html</code> 이 참조 구현이다.
          </p>
        )}
      </main>
    </div>
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
