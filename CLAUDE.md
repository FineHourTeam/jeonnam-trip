# jeonnam-trip (머물전남.)

전남 축제와 가고 싶은 장소를 모아 영업조건·자동차 이동시간을 계산해 당일~3박4일 일정으로 완성하는 반응형 웹·관리자 화면.
범위: 작업지시서 기준 — 도보 경로·당일 모드 등 제외 항목은 구현 금지. 경로=네이버 Directions(자동차).

## 절대 규칙 (항상)
- 하드코딩 금지: 색·간격·라운드·그림자는 토큰(src/styles/tokens.css)만 — hex·arbitrary 금지.
  bg-{토큰} 지정 시 text-{토큰}-foreground 페어 필수. 배경은 흰색(bg-background) 기본, 회색은 bg-background-subtle(#f9f9f9)만
- Firebase·AI 호출은 features/[기능]/api/ (repository)에서만 — 컴포넌트·훅에서 직접 금지
- UI 텍스트·에러 메시지는 한국어 + 제품 톤·문체 유지 (rules.md § 한국어 카피 체크리스트)
- 컴포넌트·패키지 우선: UI는 shadcn/ui 카탈로그 — 없으면 `npx shadcn@latest add`로 바로 추가(승인 불필요).
  손수 재구현 금지. 리치포 맵 밖 새 런타임 의존성만 에스컬레이션. 모달·토스트는 공용 래퍼만
- 프로덕션 완결성: 요청한 기능은 정상·로딩·에러·빈 상태까지 — 목업/스텁/TODO/빈 핸들러를 실경로에 남기지 않기.
  부분 구현은 지시 시만 + 미구현 보고 (rules.md § 구현 완결성)
- `any` 남용 금지, `dangerouslySetInnerHTML` 금지 (불가피하면 에스컬레이션 + sanitize)

## 제품 톤앤매너
키워드: 깔끔한, 신뢰감 있는, 실용적인 · 문체: 해요체 (전 화면·토스트·에러·이메일 통일 — 섞임은 AI 티)

상세: docs/DESIGN.md · rules.md § 톤앤매너 · § 한국어 카피.

## 시작 전 읽을 파일
작업 시작 시 knowledge/INDEX.md 먼저 로드 → 가리키는 상황별 파일만 선택적 로드.
기획 문서: docs/proposal/ 제안서 v1.4 — 04 서비스기획(기획) · 03 기능명세(스펙, FES-01 등 ID) · 05 화면설계 · 02 요구사항.
제안서에 있어도 작업지시서 "제외" 항목(도보 경로 등)은 범위 밖. 있으면 참고: docs/DESIGN.md(디자인·톤)

## 아키텍처 (얇은 레이어)
`Page → hooks(TanStack Query/Zustand) → api(repository) → Firebase/AI`
- 서버 상태=TanStack Query만, 클라 상태=Zustand만 — useEffect+fetch 금지. 폼=react-hook-form+zod, 모션=motion
- 역방향 의존·컴포넌트에서 repository 직접 호출 금지. 상세: rules.md § 아키텍처
- `src/features/[기능]/` = components/ · hooks/ · api/ · types.ts · index.ts(공개 API — 여기 없는 건 외부 import 금지)
- 백엔드: Firebase v12 모듈러 SDK만

## 모듈 경계 (요약)
- features 간 직접 import 금지 (shared 경유·index.ts 공개 API만)
- 에이전트가 쓰는 곳: docs/(questions·insights·proposals append, DESIGN.md 승인 브리프) · knowledge/mistakes/만
- ui/: shadcn add·아이콘 교체·variant 추가는 자유, 손으로 만든 새 컴포넌트·기존 variant 변경만 에스컬레이션. tokens.css: 요청받은 색은
  용도 토큰 추가·값 조정(라이트/다크 쌍)으로 처리, 위계·스케일 변경만 에스컬레이션
- firestore.rules·storage.rules: 코드와 같은 커밋으로만 변경 (§ Firebase 보안규칙 대조)
- 상세 표: rules.md § 모듈 경계

## 작업 방식
- **필요한 곳만 고친다**: 요청과 무관한 주변 코드·주석·서식을 "개선"하지 않고 기존 스타일을 따른다. 포매터는 바꾼 파일에만
  (`npx prettier --write <파일>`). 무관한 죽은 코드는 보고만 하고, 내 변경으로 안 쓰이게 된 import·함수만 지운다.
- **요청한 것만 만든다**: 한 번만 쓰는 코드에 추상화·설정 옵션을 만들지 않는다 (완결성의 상태 처리는 요청한 기능 안의 일이다).
- **Medium+ (컴포넌트·훅·새 feature)**: 착수 전 "변경 파일 + 안 건드릴 것" 1줄 선언 + 기능 중복 확인 — 선언 밖 수정이 필요해지면
  보고 후 진행. 새 feature·Firebase 연동은 feature-spec.jsx → INDEX.md 순서.
- **버그**: 재현하는 테스트를 먼저 쓰고 통과시킨다 (INDEX § 버그/오류).
- **완료 전 자기비판**: rules.md 관련 절 위반 · mistakes/recent.md 같은 실수 · 선언 밖 변경을 확인하고, 해석이 갈렸던
  가정은 완료 보고에 적는다.
- **검증**: `npm run` lint · typecheck · test · build. 끝낼 때 Stop 훅이 typecheck·lint·test를 자동으로 돌려 실패하면 되돌려
  보낸다 — 고칠 수 없으면 완료 보고에 실패 항목을 그대로 적는다.
- **같은 에러 수정 2회 실패** → 중단하고 시도 요약·근본원인·다른 접근 제안 후 사람 확인 (INDEX § 버그/오류)

## 에스컬레이션 (중단하고 보고)
요청이 규칙과 부딪히면 멈추지 말고 규칙 안의 가장 가까운 방법으로 끝낸 뒤 보고에 이유를 적는다. **아래만** 멈춘다
(다른 문서의 "에스컬레이션"도 이 목록을 가리킨다):
- 요청 범위 밖 신규 기능 · 리치포 맵 밖 새 패키지
- Firebase 프로젝트 설정·보안규칙 구조 변경
- API 키·시크릿·환경변수 (VITE_ = 번들 공개 상기)
- 손으로 만든 ui 컴포넌트·토큰 위계 변경 · 아키텍처 원칙 위반해야 풀리는 문제
- UI 명령 모호 (피그마·DESIGN·유사 화면 참조 불가) · 톤앤매너 충돌 기획

## 로그 규칙

### 요청 로깅 (코드를 바꾸는 요청마다)
수행 전 docs/questions.md에 append (파일을 읽지 말고 `grep -c '^### 요청'`로 번호만 확인 후 `cat >>`). 질문에 답만 하는
요청은 적지 않는다:
```
## YYYY-MM-DD

### 요청 N
- 내용: 한 줄 요약
- 카테고리: 기능/디자인/리팩터/버그/테스트/배포/메타/기획/AI (택 1+)
- 결과: 완료/부분완료/보류/중단 (작업 후)
- 재작업: ✓(1회 성공) / ↩×N / -(미완료) (작업 후)
- 참조: 관련 실수·함정 파일 경로 (있으면)
- 근본원인: 에이전트가 처음부터 스스로 못 한 이유 (재작업↩ 시 필수·그 외 선택)
- 일반화 후보: 규칙·문서로 만들면 다음엔 이 지시가 불필요해질 한 줄 (있으면만)
```
두 필드는 @session-analyzer가 규칙 후보를 찾는 근거다.

### 실수 기록
아래 상황 시 @mistake-logger 호출 → recent.md에 append: 사용자 "아니/다시" 수정 지시 · 같은 에러
2회 반복 · 검증 실패한 채 완료 보고 · 스펙과 다른 구현 · 규칙 위반 지적.
새 플랫폼 함정 발견 시 knowledge/pitfalls.md 추가 **제안** (직접 수정 금지).

## 커밋
`<type>(<scope>): <설명>` — feat/fix/refactor/test/docs/style/perf. 한 커밋에 하나만. base: main.

## 배포 설정
- Firebase Hosting 사이트: jeonnam-trip (https://jeonnam-trip.web.app)
- 프로덕션 도메인: jeonnam-trip.web.app
- 배포 전 `npm run check:web-assets` 통과 필수 (파비콘·앱 아이콘·OG — 누락 시 배포 훅이 막음 → /generate-web-assets)
