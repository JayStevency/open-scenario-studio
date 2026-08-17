/**
 * FR-500 정합성 검사.
 *
 * 각 항목은 지적 건수와 해당 ID 목록을 보여준다. 목록이 길면 앞 6건만 적고
 * 나머지는 건수로 접는다. 데이터가 바뀌면 즉시 다시 계산된다 —
 * 편집 뮤테이션이 이 질의를 무효화한다.
 */
import type { Check } from '@oss/domain'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PROJECT_ID } from '../api/project'
import { trpc } from '../api/trpc'

/** 명세가 정한 접기 기준. */
const PREVIEW_COUNT = 6

export function Checks() {
  const checks = useQuery(trpc.project.checks.queryOptions({ projectId: PROJECT_ID }))

  if (checks.isPending) return <p className="placeholder">검사 중…</p>
  if (checks.isError) {
    return <p className="placeholder error">검사를 불러오지 못했다: {checks.error.message}</p>
  }

  const warnings = checks.data.filter((c) => c.severity === '경고')
  const total = warnings.reduce((sum, c) => sum + c.targetIds.length, 0)

  return (
    <div className="checks">
      <p className="checks-summary">
        {total === 0 ? (
          <>경고 없음. 검사 {checks.data.length}종을 모두 통과했다.</>
        ) : (
          <>
            경고 <strong>{total}건</strong>. 아래 항목을 확인해라.
          </>
        )}
      </p>

      <ul className="check-list">
        {checks.data.map((check) => (
          <CheckRow key={check.code} check={check} />
        ))}
      </ul>
    </div>
  )
}

function CheckRow({ check }: { check: Check }) {
  const [expanded, setExpanded] = useState(false)

  const count = check.targetIds.length
  const clean = count === 0
  const hidden = count - PREVIEW_COUNT
  const shown = expanded ? check.targetIds : check.targetIds.slice(0, PREVIEW_COUNT)

  return (
    <li className={`check${clean ? ' clean' : ''}`}>
      <div className="check-head">
        <span className={`sev sev-${check.severity === '경고' ? 'warn' : 'info'}`}>
          {check.severity}
        </span>
        <span className="check-label">{check.label}</span>
        <span className="check-code">{check.code}</span>
        <span className="check-count">{clean ? '없음' : `${count}건`}</span>
      </div>

      {!clean && (
        <div className="check-targets">
          {shown.map((id) => (
            <code key={id}>{id}</code>
          ))}
          {hidden > 0 && (
            <button type="button" className="more" onClick={() => setExpanded(!expanded)}>
              {expanded ? '접기' : `외 ${hidden}건`}
            </button>
          )}
        </div>
      )}
    </li>
  )
}
