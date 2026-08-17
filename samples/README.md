# 예제 데이터

도구를 바로 돌려보기 위한 데이터다. 실제 프로젝트 명세는 `design/data/` 에 각자 넣어 쓴다(저장소에 올리지 않는다).

## order-flow — 온라인 주문 처리

시나리오 6 · 규칙 28 · 시나리오 관계 8 · 기능 그룹 7 · 개발 시나리오 3 · BR 간 관계 4.

```
SC-0 상품 탐색 → SC-1 장바구니 → SC-2 주문 접수 → SC-3 결제 → SC-4 배송 → SC-5 반품·환불
                                        ↑                  │
                                        └──── 재실행 ────────┘  (결제 최종 실패)
```

프레임워크의 요소를 한 번씩 다 보여주도록 만들었다.

- **BR 간 관계 네 종류** — 선행 · 예외 · 대체 · 데이터 의존
- **시나리오 관계 네 종류** — 전환 · 분기 · 재실행 · 준용
- **정합성 검사에 걸릴 값들을 일부러 남겼다** — 담당 주체 미지정(FR-501), 기능 그룹 미배정(FR-502), 조건 없는 관계(FR-503), 근거 규칙 없는 관계(FR-504)

검사 화면을 만들 때 이 데이터로 확인하면 된다. 참조 무결성 자체는 깨져 있지 않다 — `packages/domain/src/samples.test.ts` 가 검증한다.

## 쓰는 법

```bash
pnpm db:migrate
pnpm db:seed:sample     # 이 데이터를 DB 로
```

다른 위치의 데이터를 넣으려면 `OSS_DATA_DIR` 로 가리킨다.

```bash
OSS_DATA_DIR=samples/order-flow pnpm --filter @oss/api db:seed
```

## 파일 형식

탭 구분 TSV, UTF-8 BOM. 엑셀에서 바로 열린다. 열 정의는 `design/REQUIREMENTS.md` 4절 데이터 모델을 따른다.

| 파일 | 내용 |
|---|---|
| `01_SC_scenarios.tsv` | 시나리오 |
| `02_BR_rules.tsv` | 동작 규칙 |
| `03_REL_scenario_relations.tsv` | 시나리오 간 관계 |
| `04_CAP_capability_groups.tsv` | 기능 그룹 |
| `05_DEV_dev_scenarios.tsv` | 개발 시나리오 |
| `06_LINK_br_relations.tsv` | BR 간 관계 |
