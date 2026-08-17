import { checkIntegrity } from '@oss/domain'
import { useMemo } from 'react'
import { loadSeedData } from './data/seed'

/** FR-002 다섯 화면. 지금은 자리만 잡아 둔다. */
const TABS = [
  { id: 'rules', label: 'BR 시트' },
  { id: 'diagram', label: '관계도 편집' },
  { id: 'board', label: 'CAP · DEV 편성' },
  { id: 'scenario', label: '시나리오 상세' },
  { id: 'checks', label: '검사' },
] as const

export function App() {
  const data = useMemo(() => loadSeedData(), [])
  const violations = useMemo(() => checkIntegrity(data), [data])

  return (
    <div className="app">
      <header className="header">
        <h1>시나리오 스튜디오</h1>
        <dl className="counts">
          <Count label="시나리오" value={data.scenarios.length} />
          <Count label="규칙" value={data.rules.length} />
          <Count label="관계" value={data.relations.length} />
          <Count label="기능 그룹" value={data.capabilities.length} />
        </dl>
      </header>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" disabled>
            {tab.label}
            {tab.id === 'checks' && violations.length > 0 && (
              <span className="badge">{violations.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="main">
        <p className="placeholder">
          화면은 아직 없다. 시드 데이터 {data.rules.length}건을 읽었고 참조 무결성 위반은{' '}
          {violations.length}건이다.
        </p>
      </main>
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="count">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
