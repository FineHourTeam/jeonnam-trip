# 지식 라우터

작업 시작 시 이 파일을 먼저 읽고, 아래 표에서 해당 상황의 참조 파일만 선택적 로드.
**파일 역할**: 라우터 (라이트하게 유지)

**읽는 법**: `rules.md`·`packages.md`·`unknown-unknowns.md`·`pitfalls.md`는 통째로 읽지 않는다 — `Grep`으로 가리킨
§ 제목(또는 #번호)을 찾아 그 절만 `Read`(offset·limit)한다. 긴 문서를 통째로 넣으면 비용이 늘고 정작 필요한 규칙을 놓친다.

## 상황별 참조 순서

### 새 기능 추가
1. docs/feature-spec.jsx — 있으면 해당 기능 정의를 확인. **사용자가 직접 요청한 기능은 그 요청이 스펙**이다 (스펙 파일이
   없다는 이유로 멈추지 않는다 — 에스컬레이션은 요청 범위를 넘는 기능을 스스로 추가하려 할 때)
2. knowledge/rules.md § 아키텍처 · § 상태관리(TanStack Query/Zustand) · § 라우팅(React Router)
3. **knowledge/packages.md — 리치포 맵** (이 기능에 쓸 표준 패키지·shadcn 컴포넌트 확인, 손수 재구현 금지)
4. knowledge/mistakes/recent.md — 같은 실수 방지
5. knowledge/pitfalls.md — 관련 플랫폼 함정
6. knowledge/unknown-unknowns.md — 작업 관련 섹션만 (렌더링·훅 #14~26 / 상태·라우팅 #27~38 / 비동기·번들 #39~46)
7. src/components/ui/README.md — 재사용 컴포넌트

### UI 화면 구현
1. 피그마 노드 ID 또는 사용자 UI 명령 확인
   - 둘 다 없으면: docs/DESIGN.md + 유사 화면 참조로 추론
   - **그래도 모호하면 → 디자인 브리프 게이트**: 백지 질문 대신 **브리프 초안**(주조색·타이포 무드·
     레이아웃 방식·참고 레퍼런스 1~2개, 10줄 이내)을 먼저 제시해 사람 승인을 받는다. 승인된 브리프는
     그 화면 구현 내내 구속력 있는 스펙 — 도중에 벗어나지 않는다 (v0 GenerateDesignInspiration 방식:
     창의성은 브리프 단계에 몰고 코딩은 이행만). 승인된 브리프는 docs/DESIGN.md에 해당 화면 절로 기록.
2. **knowledge/packages.md — 리치포 맵** (드롭다운·모달·토스트·차트·캐러셀 등은 shadcn add로, 손수 금지)
3. knowledge/design-system.md — 토큰 단일 출처 (색·타이포·간격, 하드코딩 hex 금지·다크 필수)
4. src/components/ui/README.md — 기존 컴포넌트 재사용 필수
5. knowledge/rules.md § 디자인 — 토큰 매핑
6. knowledge/rules.md § 톤앤매너 + § 한국어 카피 — UI 문구 톤·문체(해요/합쇼) 통일·AI 티 블랙리스트

### 버그/오류 수정
1. knowledge/mistakes/recent.md — 동일 버그 이력
2. knowledge/pitfalls.md — 플랫폼 고질병 여부
3. knowledge/unknown-unknowns.md — 증상 관련 섹션 (프로덕션 빌드에서만 터지면 #47~58 먼저)
4. knowledge/rules.md 관련 섹션
5. **재현 테스트 먼저**: 버그를 재현해 실패하는 테스트를 쓰고, 그 테스트가 통과하도록 고친다 (재현 못 하면 그 사실과
   가설을 보고) — 테스트가 성공 기준이 되어 "고쳤다"를 확인할 수 있다
6. 수정 후 npm run lint + typecheck + test

**에러 수정 루프 이탈 프로토콜 (doom loop 차단)**: 같은 에러에 대한 수정 시도가 **2회 실패**하면
즉시 중단하고 —
1. 지금까지 시도한 접근 목록을 요약
2. 근본원인을 한 단계 더 깊이 분석 ("왜 애초에 null이었나" 수준 — 증상 가림 금지)
3. 다른 접근 1개 이상을 제안 후 사람 확인
동일 프롬프트·동일 접근 3회 반복 금지. 실패 시도로 워킹트리가 오염됐으면 그 시도에서 **에이전트가
건드린 파일만** `git checkout`으로 복원 후 재시작 (다른 작업 변경분은 보존).

### Firebase/AI 연동
1. knowledge/unknown-unknowns.md — 착수 전 미리 알아야 할 함정 (겪기 전 예방용, pitfalls.md와 다름)
2. knowledge/rules.md § Firebase 또는 § AI
3. knowledge/mistakes/recent.md
4. knowledge/pitfalls.md
5. 해당 feature의 api/ (repository)
6. **구현 후: 보안규칙 정적 대조** — 추가·변경한 연산의 (경로·필드셋·조건)을 firestore.rules/
   storage.rules의 allow와 대조 (pitfalls § Security Rules 정적 대조), 코드와 규칙 같은 커밋에 반영

### 리팩터
1. knowledge/rules.md § 아키텍처 (의존 방향)
2. knowledge/rules.md § 모듈 경계

### 작업 완료 후
1. **자기비판** (Pre-Submit Critique — 검증 명령어 전에 수행)
   - "이 변경이 rules.md § [관련 섹션]을 위반하는가?" 확인
   - "mistakes/recent.md에 같은 카테고리 실수가 있는가?" 확인
   - 위반 발견 → 즉시 수정. 수정 불가 → 에스컬레이션
2. Firestore/Storage 연산을 추가·변경했다면 보안규칙 정적 대조 (rules.md § Firebase — 보안규칙 대조)
3. 사용자향 한국어를 썼다면 rules.md § 한국어 카피 체크리스트 대조. 300자+ 산문(랜딩·온보딩·이메일·공지)은
   `/humanize-scan`(설치돼 있으면)으로 AI 티 점검 — 손볼 게 많다고 나오면 `/humanize-korean`
4. 검증 명령어 4개 실행 (lint / typecheck / test / build) — 끝낼 때 Stop 훅이 typecheck·lint·test를 다시 돌려 실패하면
   되돌려 보낸다. build는 직접 돌린다
   — 배포까지 하는 작업이면 `npm run check:web-assets`도 통과해야 한다 (파비콘·OG 누락 시 배포 훅이 막는다)
5. 실수 있었으면 @mistake-logger 호출
6. 새 플랫폼 함정 발견 시 pitfalls.md 추가 제안

## 파일별 역할

| 파일 | 내용 | 쓰기 권한 |
|------|------|---------|
| INDEX.md | 라우터 (이 파일) | 사람만 |
| rules.md | 승격된 정식 규칙 | 사람만 |
| packages.md | 리치포 맵 (이 기능엔 이 패키지·shadcn 컴포넌트) | 사람만 |
| pitfalls.md | 플랫폼 고질병 (이미 겪은 것) | 사람만 |
| unknown-unknowns.md | 겪기 전에 미리 아는 함정 | 사람만 |
| mistakes/recent.md | 에이전트 실수 로그 | 에이전트 append |
| mistakes/archive/ | 분기별 요약 | mistake-compressor |

## 서브에이전트

| 이름 | 호출 시점 | 역할 |
|------|---------|------|
| @mistake-logger | 실수 발생 시 (자동) | 실수 → recent.md 기록 |
| @rule-promoter | 주 1회 (수동) | 반복 패턴 → rules.md 승격 제안 |
| @rule-deprecator | session-analyzer 트리거 또는 수동 | rules.md 규칙 유효성 검토·삭제·충돌 제안 |
| @mistake-compressor | recent.md 200줄 초과 시 | 오래된 실수 → archive 압축 |
| @session-analyzer | 월 1회 또는 50건 누적 시 | 패턴 분석·규칙 효과성·INDEX 최적화 제안 |
| @agent-synthesizer | session-analyzer 트리거 또는 수동 | 반복 패턴 → 새 서브에이전트 초안 제안 |

## 자기개선 루프 구조

```
Level 1 (매 실수)       Level 2 (주 1회)        Level 3 (월 1회)
──────────────────     ──────────────────     ──────────────────
실수 발생               반복 패턴 탐지           시스템 전체 분석
@mistake-logger   →   @rule-promoter    →   @session-analyzer
recent.md 기록         rules.md 승격 제안        insights.md 기록
                                               ↓         ↓
                       ←── 규칙 과잉 시 ────  @rule-deprecator
                       ←── 새 패턴 발견 시 ── @agent-synthesizer
```
