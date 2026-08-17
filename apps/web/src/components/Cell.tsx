/**
 * 표 안에서 바로 고치는 셀(FR-102).
 * 편집은 즉시 저장한다(FR-004) — 값이 실제로 바뀌었을 때만 보낸다.
 */
import { useEffect, useRef, useState } from 'react'

interface EditableCellProps {
  value: string
  onCommit: (value: string) => void
  className?: string
}

/** 자유 입력. 포커스를 잃거나 Enter 를 누를 때 저장하고, Esc 로 되돌린다. */
export function EditableCell({ value, onCommit, className }: EditableCellProps) {
  const [draft, setDraft] = useState(value)
  // Enter 로 저장하면 이어서 blur 가 온다. 같은 값을 두 번 보내면 두 번째가
  // 낡은 version 으로 나가 충돌로 거절된다.
  const sent = useRef<string | null>(null)

  // 남이 고쳐 값이 바뀌면 편집 중이 아닐 때 따라간다.
  useEffect(() => {
    setDraft(value)
    sent.current = null
  }, [value])

  const commit = () => {
    if (draft === value || draft === sent.current) return
    sent.current = draft
    onCommit(draft)
  }

  return (
    <span className={className}>
      <input
        className="cell-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setDraft(value)
            e.currentTarget.blur()
          }
        }}
      />
    </span>
  )
}

interface SelectCellProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
  allowEmpty?: boolean
  /** 비어 있으면 경고색으로 표시한다(FR-106). */
  warnWhenEmpty?: boolean
}

export function SelectCell({
  value,
  options,
  onChange,
  className,
  allowEmpty = false,
  warnWhenEmpty = false,
}: SelectCellProps) {
  // 아직 목록에 없는 값이 데이터에 있을 수 있다. 그대로 보여줘야 한다.
  const known = options.some((o) => o.value === value)
  const empty = value === '' || value === '미지정'

  return (
    <span className={className}>
      <select
        className={`cell-select${warnWhenEmpty && empty ? ' warn' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">—</option>}
        {!known && value !== '' && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  )
}
