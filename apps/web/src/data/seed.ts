/**
 * 서버 없이 화면을 만들 때 쓰는 시드 데이터.
 * design/data/*.tsv 를 빌드 시점에 문자열로 읽어 ProjectData 로 바꾼다.
 * 서버 연결이 붙으면 이 경로는 오프라인 개발용으로만 남는다.
 */

import { type ProjectData, parseProjectData } from '@oss/domain'
import scenarios from '../../../../design/data/01_SC_scenarios.tsv?raw'
import rules from '../../../../design/data/02_BR_rules.tsv?raw'
import relations from '../../../../design/data/03_REL_scenario_relations.tsv?raw'
import capabilities from '../../../../design/data/04_CAP_capability_groups.tsv?raw'
import devScenarios from '../../../../design/data/05_DEV_dev_scenarios.tsv?raw'
import links from '../../../../design/data/06_LINK_br_relations.tsv?raw'

export function loadSeedData(): ProjectData {
  return parseProjectData({ scenarios, rules, relations, capabilities, devScenarios, links })
}
