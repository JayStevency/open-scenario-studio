import { describe, expect, it } from 'vitest'
import { orNull, parseIdList, parseTsv } from './tsv'

describe('parseTsv', () => {
  it('BOM과 CRLF를 걷어내고 헤더를 키로 쓴다', () => {
    const rows = parseTsv('﻿A\tB\r\n1\t2\r\n')
    expect(rows).toEqual([{ A: '1', B: '2' }])
  })

  it('빈 줄은 건너뛰고 모자란 열은 빈 문자열로 채운다', () => {
    const rows = parseTsv('A\tB\tC\n1\t2\n\n3\t4\t5\n')
    expect(rows).toEqual([
      { A: '1', B: '2', C: '' },
      { A: '3', B: '4', C: '5' },
    ])
  })

  it('헤더만 있거나 비어 있으면 빈 배열', () => {
    expect(parseTsv('A\tB\n')).toEqual([])
    expect(parseTsv('')).toEqual([])
  })
})

describe('parseIdList', () => {
  it('쉼표 목록을 자르고 공백을 없앤다', () => {
    expect(parseIdList('SC-1.1, SC-1.2 ,SC-1.5')).toEqual(['SC-1.1', 'SC-1.2', 'SC-1.5'])
  })

  it('빈 값은 빈 배열', () => {
    expect(parseIdList('')).toEqual([])
    expect(parseIdList(undefined)).toEqual([])
  })
})

describe('orNull', () => {
  it("빈 값과 '미지정'을 null로 본다", () => {
    expect(orNull('미지정')).toBeNull()
    expect(orNull('  ')).toBeNull()
    expect(orNull('CAP-01')).toBe('CAP-01')
  })
})
