# 시나리오 스튜디오 (open-scenario-studio)

시나리오(SC)와 동작 규칙(BR)을 앱 안에서 직접 관리하고, 규칙 사이의 관계를 명시하고, 정합성 문제를 자동으로 찾아내는 웹 애플리케이션. 엑셀 시트를 원본에서 내려놓고 앱을 원본으로 삼는 것이 목표다.

요구사항은 [`design/REQUIREMENTS.md`](design/REQUIREMENTS.md)에 있다.

## 시작하기

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

## 명령

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm test` | 테스트 1회 실행 |
| `pnpm test:watch` | 테스트 감시 모드 |
| `pnpm typecheck` | 타입 검사 |
| `pnpm build` | 타입 검사 + 프로덕션 빌드 |

## 구성

- **스택** — Vite 7 · React 19 · TypeScript(strict) · Vitest
- **데이터** — `design/data/*.tsv` 를 빌드 시점에 읽어 시드로 쓴다. 서버 저장은 미착수.
- **참조 구현** — `design/prototype.html` 이 다섯 화면과 검사 8종을 모두 구현한 동작 프로토타입이다.

## 진행 상황

- [x] 데이터 모델 타입 (SC · BR · REL · LINK · CAP · DEV)
- [x] TSV 적재와 참조 무결성 검사
- [x] 앱 셸 — 헤더 건수(FR-001), 탭 자리(FR-002)
- [ ] FR-100 BR 시트
- [ ] FR-200 관계도 편집
- [ ] FR-300 CAP · DEV 편성 보드
- [ ] FR-400 시나리오 상세 · BR 간 관계
- [ ] FR-500 정합성 검사 화면
- [ ] 서버 저장 · 인증 · 권한 · 충돌 처리 (NFR-03, NFR-06)
