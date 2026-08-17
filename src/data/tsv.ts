/** TSV(탭 구분, UTF-8 BOM) 파싱. design/data/*.tsv 형식 전용 — 따옴표 이스케이프는 쓰지 않는다. */
export function parseTsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').trimEnd()
  if (clean === '') return []

  const lines = clean.split('\n')
  const header = lines[0]!.split('\t').map((h) => h.trim())

  return lines.slice(1).flatMap((line) => {
    if (line.trim() === '') return []
    const cells = line.split('\t')
    const row: Record<string, string> = {}
    header.forEach((key, i) => {
      row[key] = (cells[i] ?? '').trim()
    })
    return [row]
  })
}

/** "SC-1.1, SC-1.2" 같은 쉼표 구분 ID 목록을 배열로. 빈 값은 빈 배열. */
export function parseIdList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

/** 빈 문자열과 '미지정'을 null로 정규화. */
export function orNull(value: string | undefined): string | null {
  const v = value?.trim()
  return v === undefined || v === '' || v === '미지정' ? null : v
}
