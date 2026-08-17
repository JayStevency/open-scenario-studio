# open-scenario-studio

SC · BR · CAP · DEV 프레임워크를 웹 앱으로 옮기는 프로젝트. 시나리오와 동작 규칙을 앱 안에서 직접 작성·수정하고, 규칙 사이의 관계를 명시하고, 정합성 문제를 자동으로 찾는 것이 목적이다.

## 명령

```bash
pnpm dev        # 개발 서버 (http://localhost:5173)
pnpm test       # vitest 1회 실행
pnpm typecheck  # tsc --noEmit
pnpm build      # typecheck + 프로덕션 빌드
```

패키지 매니저는 **pnpm**을 쓴다(npm/yarn 금지 — `pnpm-lock.yaml`이 원본).

## 구조

```
design/                 요구사항·프로토타입·원본 데이터 (편집 시 사람이 결정, 코드가 임의로 고치지 않는다)
  REQUIREMENTS.md       기능 요구사항 FR-000 ~ FR-500, 비기능 NFR-01 ~ NFR-06
  prototype.html        동작 프로토타입 (다섯 화면 + 검사 8종 구현됨)
  wireframes.html       W-00 ~ W-05
  data/*.tsv            현재 데이터 (탭 구분, UTF-8 BOM)
src/
  domain/types.ts       SC · BR · REL · LINK · CAP · DEV 타입 (REQUIREMENTS 4절)
  domain/integrity.ts   참조 무결성 검사
  data/tsv.ts           TSV 파서
  data/seed.ts          design/data/*.tsv → ProjectData (?raw import, 빌드 시점)
```

## 작업 규칙

- **요구사항이 기준이다.** 기능을 만들 때 `design/REQUIREMENTS.md`의 FR 번호를 찾아보고, 코드 주석이나 커밋 메시지에 FR 번호를 남긴다.
- **`design/` 아래는 산출물이자 원본이다.** TSV나 REQUIREMENTS.md를 고치는 건 사람의 결정이다. 요청받지 않았으면 건드리지 않는다.
- **데이터 모델 불변식**(REQUIREMENTS 4절)은 `src/domain/integrity.ts`가 지킨다. 모델을 바꾸면 검사도 함께 바꾸고 테스트를 추가한다.
  - BR은 정확히 하나의 SC에 속한다. 최대 하나의 CAP에 속한다(미배정 허용).
  - CAP은 정확히 하나의 DEV에 속한다.
  - LINK는 방향이 있고 SC 경계를 넘는다. 자기참조·중복 금지(FR-405).
  - 삭제한 ID는 재사용하지 않는다.
- **화면 표기는 한국어**(NFR-05). 코드 식별자는 영문, 사용자에게 보이는 문자열은 한국어.
- **데스크톱 전용**, 최소 폭 1280px(NFR-02). 모바일 대응은 범위 밖이다.
- 규모 목표는 규칙 1,000건 · 시나리오 100건 · 관계 300건(NFR-01). 전체 순회를 매 렌더 돌리는 코드는 피한다.

## 완료 기준

코드를 바꿨으면 `pnpm test`와 `pnpm typecheck`를 돌리고 결과를 보고한다. 시드 데이터의 참조 무결성 테스트(`src/data/seed.test.ts`)가 깨지면 파서나 데이터 매핑이 어긋난 것이다.

## 현재 상태

앱 셸(헤더 건수 FR-001, 탭 자리 FR-002)과 데이터 적재·무결성 검사까지 있다. 다섯 화면은 아직 비어 있고, 프로토타입(`design/prototype.html`)이 참조 구현이다. 서버 저장·인증·권한·충돌 처리(NFR-03, NFR-06)는 미착수다.
