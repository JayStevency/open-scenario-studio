# open-scenario-studio

SC · BR · CAP · DEV 프레임워크를 웹 앱으로 옮기는 프로젝트. 시나리오와 동작 규칙을 앱 안에서 직접 작성·수정하고, 규칙 사이의 관계를 명시하고, 정합성 문제를 자동으로 찾는 것이 목적이다.

## 명령

```bash
pnpm install
pnpm db:up          # docker compose 로 Postgres 기동 (최초 1회, Docker 데몬 필요)
pnpm db:migrate     # 마이그레이션
pnpm db:seed        # design/data/*.tsv → DB
pnpm dev            # web(5173) + api(3000) 동시 기동
pnpm test           # 전 패키지 vitest
pnpm typecheck      # 전 패키지 tsc --noEmit
pnpm build          # 전 패키지 빌드
pnpm check:fix      # biome 포맷 + 린트 자동 수정
```

패키지 매니저는 **pnpm**을 쓴다(npm/yarn 금지 — `pnpm-lock.yaml`이 원본). 개별 패키지는 `pnpm --filter @oss/web <script>` 형태로 돌린다.

## 구조

```
design/               요구사항·프로토타입·원본 데이터 (사람이 결정, 코드가 임의로 고치지 않는다)
  REQUIREMENTS.md     FR-000 ~ FR-500, NFR-01 ~ NFR-06
  prototype.html      동작 프로토타입 — 다섯 화면과 검사 8종의 참조 구현
  data/*.tsv          현재 데이터 (탭 구분, UTF-8 BOM)

packages/domain       @oss/domain — 서버·클라이언트 공용, 프레임워크 의존 없음
  types.ts            SC · BR · REL · LINK · CAP · DEV (REQUIREMENTS 4절)
  tsv.ts, mappers.ts  TSV 파싱과 도메인 매핑
  integrity.ts        참조 무결성 검사

apps/api              @oss/api — Fastify 5 + tRPC 11 + Prisma 7 + Postgres
  prisma/schema.prisma  DB 스키마. 편집 대상 엔티티는 전부 version 을 갖는다
  prisma/seed.ts        TSV → DB 적재
  src/router.ts         tRPC 라우터
  src/concurrency.ts    낙관적 잠금 (NFR-03)
  src/generated/        Prisma 생성물 — 커밋하지 않는다

apps/web              @oss/web — Vite 7 + React 19
  src/api/trpc.ts     tRPC 클라이언트 + react-query
  src/data/seed.ts    서버 없이 화면 만들 때 쓰는 오프라인 시드
```

## 스택 선택 이유

바꾸기 전에 이유를 먼저 읽어라.

- **Vite + Fastify 분리, Next.js 아님** — 이 앱은 문서가 아니라 편집기다. SSR·SEO 가 필요 없고, React Flow·TanStack Table·dnd-kit 이 전부 클라이언트 전용이라 RSC 의 이점이 없다.
- **zustand + immer** — immer 의 patch 를 그대로 이력(FR-406)과 되돌리기(NFR-04)에 쓴다. 편집 → patch → 로컬 적용 + 서버 전송 + 이력 적재가 한 경로다. 이력을 따로 만들면 반드시 어긋난다.
- **tRPC** — 클라이언트가 사내 웹 하나뿐이라 OpenAPI 왕복이 불필요하다. 외부 연동이 생기면 REST 를 추가한다.
- **화면별 라이브러리** — 표는 `@tanstack/react-table` + `react-virtual`(NFR-01 규칙 1,000건), 관계도는 `@xyflow/react`, 편성 보드는 `@dnd-kit`, 내보내기는 `exceljs`.

## 작업 규칙

- **요구사항이 기준이다.** 기능을 만들 때 `design/REQUIREMENTS.md`의 FR 번호를 찾아보고, 주석이나 커밋 메시지에 FR 번호를 남긴다.
- **`design/` 아래는 건드리지 않는다.** TSV 나 REQUIREMENTS.md 수정은 사람의 결정이다.
- **데이터 모델 불변식**(REQUIREMENTS 4절)은 `packages/domain/src/integrity.ts`가 지킨다. 모델을 바꾸면 검사와 Prisma 스키마를 함께 바꾸고 테스트를 추가한다.
  - BR 은 정확히 하나의 SC 에 속한다. 최대 하나의 CAP 에 속한다(미배정 허용).
  - CAP 은 정확히 하나의 DEV 에 속한다.
  - LINK 는 방향이 있고 SC 경계를 넘는다. 자기참조·중복 금지(FR-405).
  - 삭제한 ID 는 재사용하지 않는다.
- **모든 편집 뮤테이션은 낙관적 잠금을 거친다**(NFR-03). `rule.update` 가 본보기다 — `updateMany` + version 조건 → 0건이면 `assertUpdated` 로 CONFLICT, 같은 트랜잭션에서 `changeLog` 적재. 새 뮤테이션은 이 패턴을 복사해 쓴다.
- **도메인은 Prisma 를 모른다.** DB 행 → 도메인 타입 변환은 `apps/api/src/router.ts`의 `readProjectData` 가 맡는다.
- **화면 표기는 한국어**(NFR-05). 코드 식별자는 영문.
- **데스크톱 전용**, 최소 폭 1280px(NFR-02).

## 완료 기준

코드를 바꿨으면 `pnpm typecheck`와 `pnpm test`를 돌리고 결과를 보고한다. DB 스키마를 바꿨으면 `pnpm --filter @oss/api db:generate`도 함께 돌린다.

## 현재 상태

앱 셸(FR-001, FR-002)과 데이터 적재·무결성 검사, 서버 골격(스키마·tRPC·낙관적 잠금·이력)까지 있다. 다섯 화면은 아직 비어 있고 `design/prototype.html`이 참조 구현이다.

미착수: 사내 인증 연동(NFR-06 — 지금은 `x-user-id` 헤더로 흉내), 되돌리기 UI(NFR-04), 엑셀 내보내기(FR-005), 관리자 목록 설정 화면(FR-107).
