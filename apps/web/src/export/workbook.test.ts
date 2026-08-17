import type { ProjectData } from '@oss/domain'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { buildWorkbook, exportFileName } from './workbook'

const data: ProjectData = {
  scenarios: [
    { id: 'SC-0', name: '탐색', displayName: '탐색', area: '주문' },
    { id: 'SC-1', name: '장바구니', displayName: '장바구니', area: '주문' },
  ],
  rules: [
    {
      id: 'SC-0.1',
      scenarioId: 'SC-0',
      statement: '상품을 조회한다',
      ruleType: '조회',
      owner: '서버',
      capabilityId: 'CAP-01',
      status: '확정',
    },
    {
      id: 'SC-1.1',
      scenarioId: 'SC-1',
      statement: '장바구니에 담는다',
      ruleType: '상태',
      owner: '',
      capabilityId: null,
      status: '초안',
    },
  ],
  relations: [
    {
      id: 'REL-001',
      fromScenarioId: 'SC-0',
      toScenarioId: 'SC-1',
      kind: '전환',
      condition: '담기를 누름',
      basisRuleId: 'SC-1.1',
    },
  ],
  links: [
    { id: 'L-1', fromRuleId: 'SC-0.1', toRuleId: 'SC-1.1', kind: '선행', note: '조회가 먼저' },
  ],
  capabilities: [
    {
      id: 'CAP-01',
      devScenarioId: 'DEV-A',
      name: '상품 검색',
      description: '조회와 정렬',
      ruleIds: ['SC-0.1'],
    },
  ],
  devScenarios: [
    {
      id: 'DEV-A',
      name: '주문 엔진',
      description: '탐색부터 주문까지',
      owner: '서버',
      capabilityIds: ['CAP-01'],
    },
  ],
}

/** 만든 통합 문서를 다시 읽어 본다 — 엑셀이 열 수 있는 형태여야 한다. */
async function roundTrip(workbook: ExcelJS.Workbook): Promise<ExcelJS.Workbook> {
  const buffer = await workbook.xlsx.writeBuffer()
  const reopened = new ExcelJS.Workbook()
  await reopened.xlsx.load(buffer as ArrayBuffer)
  return reopened
}

describe('엑셀 내보내기 (FR-005)', () => {
  it('명세가 정한 시트로 나눈다', async () => {
    const book = await roundTrip(buildWorkbook(data, '테스트'))
    expect(book.worksheets.map((w) => w.name)).toEqual([
      '시나리오',
      '규칙',
      '시나리오 관계',
      'BR 간 관계',
      '기능 그룹',
      '개발 시나리오',
    ])
  })

  it('규칙 시트에 기능 그룹과 개발 시나리오를 함께 적는다', async () => {
    const book = await roundTrip(buildWorkbook(data, '테스트'))
    const sheet = book.getWorksheet('규칙')
    if (sheet === undefined) throw new Error('규칙 시트가 없다')

    expect(sheet.rowCount).toBe(3) // 머리글 + 규칙 2건

    const header = sheet.getRow(1).values as unknown[]
    expect(header).toContain('규칙 문장')
    expect(header).toContain('CAP 명칭')

    const first = sheet.getRow(2).values as unknown[]
    expect(first).toContain('상품을 조회한다')
    expect(first).toContain('상품 검색') // CAP 명칭이 채워진다
    expect(first).toContain('DEV-A') // 소속 개발 시나리오까지 따라온다
  })

  it('빈 값은 빈 칸으로 남긴다 — 엑셀에서 걸러 보게', async () => {
    const book = await roundTrip(buildWorkbook(data, '테스트'))
    const sheet = book.getWorksheet('규칙')
    const second = sheet?.getRow(3)
    // 미배정 규칙이라 CAP 명칭·DEV ID 가 비어 있다
    expect(second?.getCell(8).value ?? '').toBe('')
    expect(second?.getCell(9).value ?? '').toBe('')
  })

  it('ID 목록은 쉼표로 이어 한 칸에 담는다', async () => {
    const book = await roundTrip(buildWorkbook(data, '테스트'))
    const caps = book.getWorksheet('기능 그룹')
    if (caps === undefined) throw new Error('기능 그룹 시트가 없다')
    expect((caps.getRow(2).values as unknown[]).includes('SC-0.1')).toBe(true)
  })

  it('머리글을 굳히고 자동 필터를 걸어 둔다', async () => {
    const book = await roundTrip(buildWorkbook(data, '테스트'))
    const sheet = book.getWorksheet('규칙')
    expect(sheet?.views[0]?.state).toBe('frozen')
    expect(sheet?.autoFilter).toBeDefined()
  })

  it('파일 이름에 내보낸 날짜를 남긴다', () => {
    expect(exportFileName('내 프로젝트', new Date(2026, 7, 18))).toBe(
      '내 프로젝트_시나리오_20260818.xlsx',
    )
  })
})
