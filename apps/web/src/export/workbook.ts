/**
 * FR-005 전체 데이터를 엑셀에서 열리는 표 파일로 내보낸다.
 * 규칙 · 시나리오 관계 · BR 간 관계 · 기능 그룹 · 개발 시나리오를 각각 시트로 나눈다.
 *
 * 앱이 원본이고 엑셀은 산출물이다 — 가져오기는 1차 범위 밖이다(요구사항 2절).
 */
import type { ProjectData } from '@oss/domain'
import ExcelJS from 'exceljs'

interface Sheet {
  name: string
  columns: { header: string; key: string; width: number }[]
  rows: object[]
}

/** 시나리오는 첫 시트에 두어 나머지를 읽는 실마리로 삼는다. */
function sheetsOf(data: ProjectData): Sheet[] {
  const scenarioName = new Map(data.scenarios.map((s) => [s.id, s.name]))
  const capabilityName = new Map(data.capabilities.map((c) => [c.id, c.name]))
  const devOf = new Map(data.capabilities.map((c) => [c.id, c.devScenarioId]))

  return [
    {
      name: '시나리오',
      columns: [
        { header: 'SC ID', key: 'id', width: 10 },
        { header: '명칭', key: 'name', width: 24 },
        { header: '표시명', key: 'displayName', width: 20 },
        { header: '영역', key: 'area', width: 22 },
        { header: '규칙 수', key: 'ruleCount', width: 9 },
      ],
      rows: data.scenarios.map((s) => ({
        ...s,
        ruleCount: data.rules.filter((r) => r.scenarioId === s.id).length,
      })),
    },
    {
      name: '규칙',
      columns: [
        { header: 'BR ID', key: 'id', width: 12 },
        { header: 'SC ID', key: 'scenarioId', width: 10 },
        { header: '시나리오명', key: 'scenarioName', width: 20 },
        { header: '유형', key: 'ruleType', width: 12 },
        { header: '규칙 문장', key: 'statement', width: 52 },
        { header: '담당 주체', key: 'owner', width: 14 },
        { header: 'CAP ID', key: 'capabilityId', width: 10 },
        { header: 'CAP 명칭', key: 'capabilityName', width: 20 },
        { header: 'DEV ID', key: 'devId', width: 10 },
        { header: '상태', key: 'status', width: 10 },
      ],
      rows: data.rules.map((r) => ({
        ...r,
        scenarioName: scenarioName.get(r.scenarioId) ?? '',
        capabilityName: r.capabilityId === null ? '' : (capabilityName.get(r.capabilityId) ?? ''),
        devId: r.capabilityId === null ? '' : (devOf.get(r.capabilityId) ?? ''),
      })),
    },
    {
      name: '시나리오 관계',
      columns: [
        { header: 'REL ID', key: 'id', width: 12 },
        { header: '출발 SC', key: 'fromScenarioId', width: 10 },
        { header: '도착 SC', key: 'toScenarioId', width: 10 },
        { header: '관계 종류', key: 'kind', width: 10 },
        { header: '발생 조건', key: 'condition', width: 34 },
        { header: '근거 규칙 ID', key: 'basisRuleId', width: 14 },
      ],
      rows: data.relations.map((r) => ({ ...r, basisRuleId: r.basisRuleId ?? '' })),
    },
    {
      name: 'BR 간 관계',
      columns: [
        { header: 'LINK ID', key: 'id', width: 12 },
        { header: '기준 BR', key: 'fromRuleId', width: 12 },
        { header: '연결 BR', key: 'toRuleId', width: 12 },
        { header: '관계 종류', key: 'kind', width: 12 },
        { header: '비고', key: 'note', width: 40 },
      ],
      rows: [...data.links],
    },
    {
      name: '기능 그룹',
      columns: [
        { header: 'CAP ID', key: 'id', width: 10 },
        { header: 'DEV ID', key: 'devScenarioId', width: 10 },
        { header: '명칭', key: 'name', width: 22 },
        { header: '설명', key: 'description', width: 40 },
        { header: '규칙 수', key: 'ruleCount', width: 9 },
        { header: '포함 BR ID', key: 'ruleIds', width: 44 },
      ],
      rows: data.capabilities.map((c) => ({
        ...c,
        ruleCount: c.ruleIds.length,
        ruleIds: c.ruleIds.join(', '),
      })),
    },
    {
      name: '개발 시나리오',
      columns: [
        { header: 'DEV ID', key: 'id', width: 10 },
        { header: '명칭', key: 'name', width: 22 },
        { header: '설명', key: 'description', width: 40 },
        { header: '담당', key: 'owner', width: 20 },
        { header: 'CAP 수', key: 'capCount', width: 8 },
        { header: '포함 CAP', key: 'capabilityIds', width: 34 },
      ],
      rows: data.devScenarios.map((d) => ({
        ...d,
        capCount: d.capabilityIds.length,
        capabilityIds: d.capabilityIds.join(', '),
      })),
    },
  ]
}

/** 내보낼 통합 문서를 만든다. 파일로 쓰는 것은 부르는 쪽이 한다. */
export function buildWorkbook(data: ProjectData, projectName: string): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '시나리오 스튜디오'

  for (const sheet of sheetsOf(data)) {
    const ws = workbook.addWorksheet(sheet.name)
    ws.columns = sheet.columns
    ws.addRows(sheet.rows)

    // 머리글은 굳혀 두고 훑을 때 따라오게 한다.
    ws.getRow(1).font = { bold: true }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    }
  }

  workbook.properties.date1904 = false
  workbook.title = projectName
  return workbook
}

/** 파일 이름. 언제 내보낸 것인지 남는다. */
export function exportFileName(projectName: string, at: Date): string {
  const stamp = [
    at.getFullYear(),
    String(at.getMonth() + 1).padStart(2, '0'),
    String(at.getDate()).padStart(2, '0'),
  ].join('')
  return `${projectName}_시나리오_${stamp}.xlsx`
}
