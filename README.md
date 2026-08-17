# 시나리오 스튜디오

시나리오와 동작 규칙을 앱 안에서 직접 관리하고, 규칙 사이의 관계를 명시하고, 명세가 덜 여문 곳을 자동으로 찾아내는 도구다. AI 에이전트가 MCP 로 붙어 명세를 함께 만든다.

엑셀 시트를 원본에서 내려놓고 앱을 원본으로 삼는 것이 목표다.

---

## 필요한 것

| | 버전 | 확인 |
|---|---|---|
| Node.js | 22 이상 | `node -v` |
| pnpm | 10 이상 | `pnpm -v` |

pnpm 이 없으면 `corepack enable pnpm` 으로 켠다. DB 는 SQLite 파일이라 따로 설치할 게 없다.

## 5분 안에 띄우기

```bash
git clone https://github.com/JayStevency/open-scenario-studio.git
cd open-scenario-studio

pnpm install
pnpm db:migrate       # data/scenario-studio.db 를 만든다
pnpm db:seed:sample   # 예제 데이터를 넣는다 (규칙 28건)
pnpm dev              # 웹과 API 를 함께 띄운다
```

브라우저에서 **http://localhost:5173** 을 연다. 규칙 28건이 표로 뜨면 성공이다.

`pnpm dev` 는 두 프로세스를 함께 띄운다.

- 웹 `http://localhost:5173`
- API `http://localhost:3000`

## 화면 다섯 개

| 탭 | 하는 일 |
|---|---|
| **BR 시트** | 규칙을 표로 놓고 셀을 바로 고친다. 검색·필터, 추가·복제·삭제 |
| **관계도 편집** | 시나리오를 노드로 그린다. 끌어 옮기면 위치가 저장되고, 이으면 관계가 생긴다 |
| **CAP · DEV 편성** | 규칙을 칩으로 끌어 기능 그룹에 배정한다. 여기서 나눈 단위가 개발 작업 단위가 된다 |
| **시나리오 상세** | 규칙 사이의 관계를 만들고 해제한다. 변경 이력과 메모를 함께 본다 |
| **검사** | 명세가 덜 여문 곳 8종을 찾는다. 데이터를 고치면 즉시 다시 센다 |

헤더의 **엑셀 내보내기** 로 전체를 시트별로 나눠 받는다.

## 내 데이터 넣기

예제 대신 자기 데이터를 쓰려면 TSV 여섯 개를 `design/data/` 에 넣고 시드한다.

```bash
mkdir -p design/data
cp /어딘가/*.tsv design/data/
pnpm db:seed
```

파일 이름과 열 구성은 [`samples/README.md`](samples/README.md) 를 따른다. 탭 구분, UTF-8 BOM 이라 엑셀에서 바로 열린다.

`design/data/` 는 저장소에 올리지 않는다 — 프로젝트마다 다른 내용이기 때문이다. 없어도 빌드와 테스트는 통과한다.

## 에이전트 붙이기

에이전트는 명세를 **읽는 쪽이 아니라 만드는 쪽**이다. 규칙 문장을 다듬고, 규칙 사이의 관계를 찾아내고, 기능 그룹 편성을 제안한다.

```bash
claude mcp add scenario-studio -- pnpm --filter @oss/mcp start
pnpm mcp:smoke    # 도구가 DB 에 제대로 붙는지 점검
```

도구는 여덟 개다. 읽기는 `get_project` · `get_rule` · `list_rule_links` · `check_integrity`, 쓰기는 `update_rule` · `assign_rule_to_capability` · `create_rule_link` · `delete_rule_link`.

쓰기는 모두 건 단위이고 `version` 을 요구한다. 사람이 화면에서 같은 데이터를 고치고 있으면 거절하고 다시 읽게 한다. 에이전트가 고친 것은 이력에 따로 표시되고, **잘못 고쳤으면 시나리오 상세의 이력에서 되돌릴 수 있다.**

## 명령

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 웹 + API 함께 |
| `pnpm dev:web` / `pnpm dev:api` | 하나만 |
| `pnpm db:migrate` | DB 파일 생성과 스키마 적용 |
| `pnpm db:seed` / `pnpm db:seed:sample` | 내 데이터 / 예제 데이터 |
| `pnpm db:reset` | DB 를 비우고 다시 만든다 |
| `pnpm mcp:smoke` | MCP 도구 점검 |
| `pnpm test` | 테스트 |
| `pnpm typecheck` | 타입 검사 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm check:fix` | 포맷·린트 자동 수정 |

## 막혔을 때

**브라우저가 연결하지 못한다** — 5173 이나 3000 을 다른 프로그램이 쓰고 있는지 본다. `lsof -nP -iTCP:5173 -sTCP:LISTEN`

**화면이 비어 있다** — 데이터를 안 넣었다. `pnpm db:seed:sample`

**`DATABASE_URL` 관련 오류** — 기본값은 저장소 안 `data/scenario-studio.db` 다. 다른 위치를 쓰려면 [`apps/api/env.example`](apps/api/env.example) 을 `apps/api/.env` 로 복사한다.

**스키마를 고친 뒤 타입이 안 맞는다** — `pnpm --filter @oss/api db:generate`

## 구성

```
packages/domain   공용 도메인 — 타입, TSV 파서, 무결성 검사, 정합성 검사
apps/api          Fastify 5 · tRPC 11 · Prisma 7 · SQLite
apps/mcp          MCP 서버 — 에이전트가 붙는 통로
apps/web          Vite 7 · React 19 · TanStack Table/Query · React Flow · dnd-kit
samples/          예제 데이터
design/           요구사항 명세와 동작 프로토타입
```

요구사항은 [`design/REQUIREMENTS.md`](design/REQUIREMENTS.md), 설계 판단의 근거는 [`CLAUDE.md`](CLAUDE.md) 에 있다.

## 아직 없는 것

- 사용자 인증 — 지금은 `x-user-id` 헤더로 신원을 흉내 낸다
- 유형·담당 주체 선택 목록의 관리자 설정 — 지금은 데이터에 쓰인 값을 모아 쓴다
- 시나리오 자체의 추가·삭제
- 엑셀 가져오기 — 앱이 원본이라는 전제라 범위 밖이다
- 되돌리기는 수정 전체와 규칙 간 관계의 생성·삭제까지다

드래그가 들어가는 두 화면(관계도 노드 이동, 편성 보드 칩 옮기기)은 브라우저에서 직접 확인해야 한다.

## 라이선스

MIT
