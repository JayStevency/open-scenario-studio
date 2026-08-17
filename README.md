# 시나리오 스튜디오 (open-scenario-studio)

시나리오(SC)와 동작 규칙(BR)을 앱 안에서 직접 관리하고, 규칙 사이의 관계를 명시하고, 정합성 문제를 자동으로 찾아내는 웹 애플리케이션. 엑셀 시트를 원본에서 내려놓고 앱을 원본으로 삼는 것이 목표다.

요구사항은 [`design/REQUIREMENTS.md`](design/REQUIREMENTS.md)에 있다.

## 시작하기

```bash
pnpm install
pnpm db:up        # Postgres 컨테이너 (Docker 데몬이 떠 있어야 한다)
pnpm db:migrate   # 스키마 적용
pnpm db:seed      # design/data/*.tsv 를 DB 로
pnpm dev          # web http://localhost:5173 · api http://localhost:3000
```

DB 없이 화면만 만들려면 `pnpm dev:web` 으로 충분하다. `apps/web/src/data/seed.ts` 가 TSV 를 직접 읽는다.

접속 정보는 `apps/api/env.example` 을 `apps/api/.env` 로 복사해 쓴다. 복사하지 않으면 docker-compose 와 같은 로컬 기본값으로 붙는다(프로덕션에서는 `DATABASE_URL` 필수).

## 명령

| 명령 | 설명 |
|---|---|
| `pnpm dev` | web + api 동시 기동 |
| `pnpm dev:web` / `pnpm dev:api` | 하나만 기동 |
| `pnpm test` | 전 패키지 테스트 |
| `pnpm typecheck` | 전 패키지 타입 검사 |
| `pnpm build` | 전 패키지 빌드 |
| `pnpm check:fix` | biome 포맷·린트 자동 수정 |
| `pnpm db:up` / `db:down` | Postgres 컨테이너 |
| `pnpm db:migrate` / `db:seed` | 마이그레이션 · 시드 |

## 구성

```
packages/domain   공용 도메인 — 타입, TSV 파서, 참조 무결성 검사
apps/api          Fastify 5 · tRPC 11 · Prisma 7 · PostgreSQL 17
apps/web          Vite 7 · React 19 · TanStack Table/Query · React Flow · dnd-kit
design/           요구사항 · 와이어프레임 · 동작 프로토타입 · 원본 TSV
```

설계 판단의 근거는 [`CLAUDE.md`](CLAUDE.md)의 "스택 선택 이유"에 적어두었다.

## 진행 상황

- [x] 데이터 모델 타입 (SC · BR · REL · LINK · CAP · DEV)
- [x] TSV 적재와 참조 무결성 검사
- [x] 앱 셸 — 헤더 건수(FR-001), 탭 자리(FR-002)
- [x] DB 스키마 — 버전 컬럼(NFR-03), append-only 변경 이력(FR-406), 프로젝트별 권한
- [x] tRPC 라우터 골격 + 낙관적 잠금 패턴
- [ ] FR-100 BR 시트
- [ ] FR-200 관계도 편집
- [ ] FR-300 CAP · DEV 편성 보드
- [ ] FR-400 시나리오 상세 · BR 간 관계
- [ ] FR-500 정합성 검사 화면
- [ ] FR-005 엑셀 내보내기
- [ ] 사내 인증 연동 (NFR-06) — 지금은 `x-user-id` 헤더로 흉내 낸다
- [ ] 되돌리기 (NFR-04)
