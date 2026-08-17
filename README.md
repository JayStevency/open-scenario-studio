# 시나리오 스튜디오 (open-scenario-studio)

시나리오(SC)와 동작 규칙(BR)을 앱 안에서 직접 관리하고, 규칙 사이의 관계를 명시하고, 정합성 문제를 자동으로 찾아내는 웹 애플리케이션. 엑셀 시트를 원본에서 내려놓고 앱을 원본으로 삼는 것이 목표다.

요구사항은 [`design/REQUIREMENTS.md`](design/REQUIREMENTS.md)에 있다.

## 시작하기

```bash
pnpm install
pnpm db:migrate      # SQLite 파일 생성 + 스키마 적용
pnpm db:seed:sample  # 예제 데이터 적재 (samples/order-flow)
pnpm dev             # web http://localhost:5173 · api http://localhost:3000
```

자기 데이터를 쓰려면 `design/data/` 에 TSV 여섯 개를 넣고 `pnpm db:seed` 를 돌린다. 형식은 [`samples/README.md`](samples/README.md) 참고.

에이전트를 붙이려면:

```bash
claude mcp add scenario-studio -- pnpm --filter @oss/mcp start
pnpm mcp:smoke    # 도구가 실제 DB 에 대고 도는지 점검
```

DB 없이 화면만 만들려면 `pnpm dev:web` 으로 충분하다. `apps/web/src/data/seed.ts` 가 TSV 를 직접 읽는다.

데이터는 저장소 안 `data/scenario-studio.db` 에 쌓인다(git 에는 올리지 않는다). 다른 위치를 쓰려면 `apps/api/env.example` 을 참고해 `.env` 를 만든다.

**실제 시나리오 데이터(`design/data/`)는 저장소에 올리지 않는다.** 프로젝트마다 다른 내부 명세이기 때문이다. 없어도 빌드와 테스트는 통과한다.

## 명령

| 명령 | 설명 |
|---|---|
| `pnpm dev` | web + api 동시 기동 |
| `pnpm dev:web` / `pnpm dev:api` | 하나만 기동 |
| `pnpm test` | 전 패키지 테스트 |
| `pnpm typecheck` | 전 패키지 타입 검사 |
| `pnpm build` | 전 패키지 빌드 |
| `pnpm check:fix` | biome 포맷·린트 자동 수정 |
| `pnpm db:migrate` | 마이그레이션 |
| `pnpm db:seed` / `db:seed:sample` | 내 데이터 · 예제 데이터 적재 |
| `pnpm db:reset` | DB 를 비우고 다시 만든다 |
| `pnpm mcp:smoke` | MCP 도구 점검 |

## 구성

```
packages/domain   공용 도메인 — 타입, TSV 파서, 참조 무결성 검사
apps/api          Fastify 5 · tRPC 11 · Prisma 7 · SQLite
apps/mcp          MCP 서버 — 에이전트가 BR 과 관계를 편집하는 통로
apps/web          Vite 7 · React 19 · TanStack Table/Query · React Flow · dnd-kit
design/           요구사항 · 와이어프레임 · 동작 프로토타입
samples/          예제 데이터 — 바로 돌려볼 수 있다
```

에이전트는 명세를 읽는 쪽이 아니라 **만드는 쪽**이다. BR 문장을 다듬고, BR 간 관계를 찾아내고, 기능 그룹 편성을 제안한다. 모든 쓰기는 건 단위이고 `version` 을 요구하며, 변경 전 값과 함께 이력에 남는다.

설계 판단의 근거는 [`CLAUDE.md`](CLAUDE.md)의 "스택 선택 이유"에 적어두었다.

## 알려진 제약

- 다섯 화면 중 BR 시트만 있다. 나머지는 `design/prototype.html` 이 참조 구현이다.
- 사내 인증(NFR-06)이 없다. `x-user-id` 헤더로 신원을 흉내 내며, 실제 사용자 행이 없으면 이력에 이름만 남는다.

## 진행 상황

- [x] 데이터 모델 타입 (SC · BR · REL · LINK · CAP · DEV)
- [x] TSV 적재와 참조 무결성 검사
- [x] 앱 셸 — 헤더 건수(FR-001), 탭 자리(FR-002)
- [x] DB 스키마 — 버전 컬럼(NFR-03), append-only 변경 이력(FR-406), 프로젝트별 권한
- [x] tRPC 라우터 골격 + 낙관적 잠금 패턴
- [x] MCP 서버 — 읽기 4종 · 쓰기 4종, 에이전트 이력 구분
- [x] FR-100 BR 시트 — 표 · 인라인 편집 · 검색/필터 · 추가/복제/삭제 · 경고색
- [ ] FR-200 관계도 편집
- [ ] FR-300 CAP · DEV 편성 보드
- [ ] FR-400 시나리오 상세 · BR 간 관계
- [ ] FR-500 정합성 검사 화면
- [ ] FR-005 엑셀 내보내기
- [ ] 사내 인증 연동 (NFR-06) — 지금은 `x-user-id` 헤더로 흉내 낸다
- [ ] 되돌리기 (NFR-04)
