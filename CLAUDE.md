# open-scenario-studio

SC · BR · CAP · DEV 프레임워크를 웹 앱으로 옮기는 프로젝트. 시나리오와 동작 규칙을 앱 안에서 직접 작성·수정하고, 규칙 사이의 관계를 명시하고, 정합성 문제를 자동으로 찾는 것이 목적이다.

## 명령

```bash
pnpm install
pnpm db:migrate     # SQLite 파일 생성 + 마이그레이션 (data/scenario-studio.db)
pnpm db:seed:sample # 예제 데이터 (samples/order-flow) → DB
pnpm db:seed        # design/data/*.tsv → DB
pnpm dev            # web(5173) + api(3000) 동시 기동
pnpm mcp:smoke      # MCP 도구를 실제 DB 에 대고 한 바퀴 점검
pnpm test           # 전 패키지 vitest
pnpm typecheck      # 전 패키지 tsc --noEmit
pnpm build          # 전 패키지 빌드
pnpm check:fix      # biome 포맷 + 린트 자동 수정
```

패키지 매니저는 **pnpm**을 쓴다(npm/yarn 금지 — `pnpm-lock.yaml`이 원본). 개별 패키지는 `pnpm --filter @oss/web <script>` 형태로 돌린다.

## 구조

```
design/               요구사항·프로토타입 (사람이 결정, 코드가 임의로 고치지 않는다)
  REQUIREMENTS.md     FR-000 ~ FR-500, NFR-01 ~ NFR-06
  prototype.html      동작 프로토타입 — 다섯 화면과 검사 8종의 참조 구현
  data/*.tsv          실제 명세. 저장소에 올리지 않는다 — 없을 수 있다는 전제로 다룬다

samples/order-flow    예제 데이터. 공개 저장소에서 바로 돌려볼 수 있게 둔 것

packages/domain       @oss/domain — 서버·클라이언트 공용, 프레임워크 의존 없음
  types.ts            SC · BR · REL · LINK · CAP · DEV (REQUIREMENTS 4절)
  tsv.ts, mappers.ts  TSV 파싱과 도메인 매핑
  integrity.ts        참조 무결성 — "데이터가 깨졌는가"
  checks.ts           FR-500 정합성 검사 8종 — "명세가 덜 여물었는가"

apps/api              @oss/api — Fastify 5 + tRPC 11 + Prisma 7 + SQLite
  prisma/schema.prisma  DB 스키마. 편집 대상 엔티티는 전부 version 을 갖는다
  prisma/seed.ts        TSV → DB 적재
  src/router.ts         tRPC 라우터
  src/concurrency.ts    낙관적 잠금 (NFR-03)
  src/changelog.ts      변경 이력 적재 (FR-406). before 를 반드시 남긴다
  src/generated/        Prisma 생성물 — 커밋하지 않는다

apps/mcp              @oss/mcp — 에이전트가 붙는 MCP 서버 (stdio)
  src/tools.ts        도구 정의. 읽기 4종 + 쓰기 4종
  src/caller.ts       tRPC 를 HTTP 없이 직접 호출 — 웹과 같은 경로를 탄다
  scripts/smoke.mts   실제 DB 에 대고 도구를 한 바퀴 돌리는 점검

apps/web              @oss/web — Vite 7 + React 19
  src/api/trpc.ts     tRPC 클라이언트 + react-query
  src/api/project.ts  화면이 쓰는 질의·편집. 저장 상태와 충돌 처리를 여기서 다룬다
  src/screens/        화면 하나에 파일 하나 — RuleSheet(FR-100) · Diagram(FR-200) ·
                      Board(FR-300) · ScenarioDetail(FR-400) · Checks(FR-500)
  src/components/     셀 편집기 등 공용 조각
  src/data/seed.ts    서버 없이 화면 만들 때 쓰는 오프라인 시드
  vitest.setup.ts     jsdom 에 레이아웃을 흉내 낸다 — 없으면 가상 스크롤이 행을 안 그린다
```

## 에이전트가 이 도구를 쓰는 방식

에이전트는 명세를 **읽는 쪽이 아니라 만드는 쪽**이다. 주로 BR 문장을 다듬고, BR 간 관계(LINK)를 찾아내고, 기능 그룹 편성을 제안한다.

```bash
claude mcp add scenario-studio -- pnpm --filter @oss/mcp start
```

- 쓰기는 전부 **건 단위**이고 `version` 을 요구한다. 사람이 화면에서 같은 데이터를 고치고 있을 수 있으므로, 어긋나면 거절하고 다시 읽게 한다
- 에이전트의 변경은 이력에 `actorType=AGENT` 로 남는다. 나중에 "에이전트가 고친 것만" 걸러 볼 수 있다
- 에이전트는 기존 문장을 덮어쓸 수 있다. 그래서 이력에 `before` 를 반드시 남긴다 — 원래 값이 거기 말고는 남는 곳이 없다

## 스택 선택 이유

바꾸기 전에 이유를 먼저 읽어라.

- **SQLite** — 전체 데이터가 23KB 다. 편집자는 소수이고 에이전트는 MCP 로 로컬에서 붙는다. 서버 DB 를 둘 이유가 없다. 제약은 원시 타입 배열을 못 쓴다는 것 하나뿐이고(enum·Json 은 된다), 해당 필드는 JSON 으로 담고 읽을 때 배열로 되돌린다.
- **Vite + Fastify 분리, Next.js 아님** — 이 앱은 문서가 아니라 편집기다. SSR·SEO 가 필요 없고, React Flow·TanStack Table·dnd-kit 이 전부 클라이언트 전용이라 RSC 의 이점이 없다.
- **zustand + immer** — immer 의 patch 를 그대로 이력(FR-406)과 되돌리기(NFR-04)에 쓴다. 편집 → patch → 로컬 적용 + 서버 전송 + 이력 적재가 한 경로다. 이력을 따로 만들면 반드시 어긋난다.
- **tRPC** — 클라이언트가 웹과 MCP 둘 다 같은 저장소 안에 있어 OpenAPI 왕복이 불필요하다. 외부 연동이 생기면 REST 를 추가한다.
- **화면별 라이브러리** — 표는 `@tanstack/react-table` + `react-virtual`(NFR-01 규칙 1,000건), 관계도는 `@xyflow/react`, 편성 보드는 `@dnd-kit`, 내보내기는 `exceljs`.

## 작업 규칙

- **요구사항이 기준이다.** 기능을 만들 때 `design/REQUIREMENTS.md`의 FR 번호를 찾아보고, 주석이나 커밋 메시지에 FR 번호를 남긴다.
- **`design/` 아래는 건드리지 않는다.** TSV 나 REQUIREMENTS.md 수정은 사람의 결정이다.
- **특정 도메인에 묶지 않는다.** 이 도구는 범용이다. 예시가 필요하면 `samples/` 를 쓰고, 코드·문서에 특정 프로젝트의 업무 용어를 박아 넣지 않는다.
- **`design/data/` 가 없어도 빌드와 테스트가 통과해야 한다.** 데이터 접근은 `@oss/domain/designData` 로 모으고, 웹은 정적 import 대신 `import.meta.glob` 을 쓴다.
- **데이터 모델 불변식**(REQUIREMENTS 4절)은 `packages/domain/src/integrity.ts`가 지킨다. 모델을 바꾸면 검사와 Prisma 스키마를 함께 바꾸고 테스트를 추가한다.
  - BR 은 정확히 하나의 SC 에 속한다. 최대 하나의 CAP 에 속한다(미배정 허용).
  - CAP 은 정확히 하나의 DEV 에 속한다.
  - LINK 는 방향이 있고 SC 경계를 넘는다. 자기참조·중복 금지(FR-405).
  - 삭제한 ID 는 재사용하지 않는다.
  - **ID 는 프로젝트 안에서만 유일하다.** 모든 엔티티가 `@@id([projectId, id])` 복합 키다. 서로 다른 프로젝트가 같은 `SC-0` 을 써도 부딪히지 않는다. 조회·수정은 반드시 `projectId` 로 범위를 좁힌다.
  - CAP·근거 규칙 삭제 시의 배정 해제는 **DB 가 아니라 앱이 한다**(FR-108). 복합 키에서는 `SetNull` 을 쓸 수 없고, 무엇이 함께 정리되는지 사용자에게 알려야 하기 때문이다.
- **모든 편집 뮤테이션은 낙관적 잠금을 거친다**(NFR-03). `rule.update` 가 본보기다 — `updateMany` + version 조건 → 0건이면 `assertUpdated` 로 CONFLICT, 같은 트랜잭션에서 `changeLog` 적재. 새 뮤테이션은 이 패턴을 복사해 쓴다.
- **도메인은 Prisma 를 모른다.** DB 행 → 도메인 타입 변환은 `apps/api/src/router.ts`의 `readProjectData` 가 맡는다.
- **화면 표기는 한국어**(NFR-05). 코드 식별자는 영문.
- **데스크톱 전용**, 최소 폭 1280px(NFR-02).

## 완료 기준

코드를 바꿨으면 `pnpm typecheck`와 `pnpm test`를 돌리고 결과를 보고한다. DB 스키마를 바꿨으면 `pnpm --filter @oss/api db:generate`도 함께 돌린다.

## 잠정 — 요구사항 확정 전에 앞서 만든 것

`REQUIREMENTS.md`는 v0.1 초안이고 8절에 미결 사항이 남아 있다. 아래는 그 위에 미리 쌓은 코드다. **확정된 설계가 아니라 한 가지 안**이며, 논의 결과에 따라 갈아엎는 것을 전제로 한다. 여기에 새 코드를 얹기 전에 먼저 확인하라.

| 대상 | 잠정인 이유 |
|---|---|
| `apps/api/prisma/schema.prisma` | 요구사항 8절 미결 사항(엑셀 가져오기 · 승인 흐름)이 정해지면 바뀐다 |
| `apps/api/src/router.ts` 의 `rule.update` | FR-102 구현의 첫 조각. 편집 단위·patch 형태가 화면 설계에 달렸다 |
| `apps/api/src/router.ts` 의 `readProjectData` | 화면이 무엇을 필요로 하는지 정해지기 전에 쓴 매핑이다 |
| `packages/domain/src/integrity.ts` 검사 11종 | 요구사항이 아니라 임의 판단으로 정한 목록이다. 명세가 정한 검사 8종은 `checks.ts` 에 따로 있다 |

## 현재 상태

**다섯 화면이 모두 동작한다.** 화면이 DB 를 보고, 편집이 낙관적 잠금을 거쳐 이력에 남으며, 편집 즉시 검사가 다시 계산된다. 에이전트가 MCP 로 만든 BR 간 관계를 사람이 보고 고칠 수 있다.

미착수: 엑셀 내보내기(FR-005), 되돌리기(NFR-04), 사내 인증(NFR-06), 관리자 목록 설정(FR-107), 시나리오 추가·삭제(FR-206).

드래그가 들어가는 두 화면(관계도 노드 이동, 편성 보드 칩 옮기기)은 jsdom 으로는 그 아래 로직까지만 검증된다. 고쳤으면 브라우저에서 직접 확인해라.

tRPC 추론 타입이 깊어져 `TS2589` 가 나면, 화면이 쓰는 만큼만 인터페이스로 적어 끊는다(`ScenarioDetail.tsx` 의 `HistoryEntry` 참고).

화면을 만들 때는 `src/screens/RuleSheet.tsx` 를 본보기로 삼는다 — 질의는 `src/api/project.ts` 에 모으고, 편집은 version 을 실어 보내고, 실패는 헤더에 보여준다.

미착수: 사내 인증 연동(NFR-06 — 지금은 `x-user-id` 헤더로 흉내), 되돌리기 UI(NFR-04), 엑셀 내보내기(FR-005), 관리자 목록 설정 화면(FR-107).
