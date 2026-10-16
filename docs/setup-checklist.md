# 설치 체크리스트

> `bootstrap.md`가 설치하면서 채우고, 이후에는 "지금 이 프로젝트에 무엇이 연결돼 있고 무엇이 남았는지" 보는 용도로 쓴다.
> 스타터킷 버전: `.claude/starter-version` (설치일 `2026-10-16`, v2.0.0). 새 버전은 세션 시작 훅이 알리고 `/update-starter`가 반영한다.

**읽는 법**
- `[x]` 완료 · `[ ]` 할 일 · `[-]` 해당없음(이 프로젝트에 필요 없음). 해당없음도 지우지 말고 `[-]`로 남긴다.
- 모든 항목은 **한 곳에만** 있다. 다른 곳(Day 0 표·스킬 안내)은 ID(`F2` 등)로 가리킨다 — 체크는 항목이 있는 섹션에서 한다.
- `` `[...]` ``는 확정 안 된 값이다. 확정되면 값으로 바꾼다.
- 새 도구·MCP·API를 붙이면 맞는 섹션에 다음 번호로 추가한다.

## ⚡ Day 0 — 방치하면 첫 빌드·첫 배포에서 반드시 막히는 것

설치가 끝나면 에이전트가 아래 항목 중 미완료인 것을 하나씩 브리핑한다 (왜 지금 · 어디서 어떻게 · 끝나면 해당 섹션에 체크).

| ID | 항목 | 안 하면 |
|----|------|--------|
| Q1 | 검증 4종이 이 머신에서 도는지 | 에이전트의 끝내기 전 검사가 매번 실패 |
| S1 | 시크릿 파일이 `.gitignore`에 있는지 | 키가 저장소에 올라감 |
| F1~F3 | Firebase 서비스 활성화 · `.env` config · 보안 규칙 | 흰 화면 · 권한 오류 · 데이터 노출 |
| M1 | MCP 등록 후 새 세션 시작 | MCP 도구가 안 보임 |
| Q2~Q3 | CI 설치 · 첫 push 그린 | PR 검사가 안 돎 |
| P1~P3 | Hosting 연결 · 배포 워크플로우 · preview 1회 | 배포 계획이 있는데 배포 경로가 없음 |

---

## 1. 개발 도구 (이 머신 · 사용자 전역)

- [x] **T1** Node.js 20+ / npm — 확인: `node --version`
- [x] **T2** GitHub CLI `gh` 로그인 — 저장소: `FineHourTeam/jeonnam-trip` (private, 첫 push 전)
- [x] **T3** Firebase CLI 로그인(법인 계정 25finehour@gmail.com) — 프로젝트: `jeonnam-trip`
- [x] **T4** Google Cloud CLI `gcloud` 로그인(T3와 같은 계정) + `gcloud config set project`가 T3와 일치
      (전역 기본 프로젝트는 다른 작업용이라 바꾸지 않고, 명령마다 `--project=jeonnam-trip`을 붙였다)
      — 서비스 계정 키·API 활성화·IAM 작업에 필요
- [x] **T5** Playwright 브라우저 — E2E·OG 이미지 렌더링에 필요할 때: `npx playwright install chromium`
- [-] **T6** Claude in Chrome (이 머신은 gstack `/browse`로 브라우저 QA — 사용자 전역 규칙) — 브라우저 QA·콘솔 확인이 필요할 때: https://claude.ai/chrome
- [x] **T7** im-not-ai(`/humanize-scan`·`/humanize-korean`) — 300자 넘는 사용자향 산문(랜딩·온보딩·이메일)을 쓰기 전에.
      설치: `/plugin marketplace add epoko77-ai/im-not-ai` → `/plugin install humanize-korean@im-not-ai`

> 에이전트의 한국어 문장 품질(fluent-korean output-style)은 설치 때 자동으로 켜진다 — 할 일 없음. 끄려면 settings.json의 `outputStyle` 삭제.

## 2. 코드 품질 게이트

- [x] **Q1** 검증 4종(`npm run lint` · `typecheck` · `test` · `build`)이 이 머신에서 한 번씩 통과
- [x] **Q2** `.github/workflows/react-ci.yml` 설치 (`templates/ci/react-ci.yml` 기반)
- [ ] **Q3** 첫 push에서 CI 그린 확인
- [ ] **Q4** 의존성 자동 업데이트(Dependabot 또는 Renovate) 켜기

## 3. 디자인 시스템

- [x] **D1** 브랜드 주조색이 `tokens.css`에 반영됨 (기본 무채색 플레이스홀더 아님) — 소스: `없음(시드) #805117 황토 갈색` — 갑 제공 브랜드 가이드 수령 시 교체
- [x] **D2** 명도 대비 테스트 통과 — `npx vitest run src/styles` (배경/글자 쌍 4.5:1, 라이트·다크)
- [x] **D3** 아이콘 스타일 가이드 승인 + 기본 세트 13종 (`src/components/icons/README.md`), `grep -rn "lucide-react" src` 0줄
- [ ] **D4** `docs/DESIGN.md` — 톤·화면 원칙 (없으면 첫 화면 작업 전에 작성)

## 4. Firebase (Firebase를 쓰는 프로젝트만)

- [x] **F1** Authentication · Firestore(리전 `asia-northeast3`) · Storage 활성화 (CLI/REST, 버킷 `jeonnam-trip.firebasestorage.app`)
- [x] **F2** 웹 앱 등록 → config를 `.env`의 `VITE_FIREBASE_*` 6종으로
- [x] **F3** Firestore·Storage 보안 규칙이 테스트 모드(`allow if true`) 아님
- [ ] **F4** 에뮬레이터(`firebase init emulators` — auth·firestore·storage) + 로컬 개발 연결 확인 `[firebase.json 설정 완료, 실행 확인 전]`
- [ ] **F5** 테스트 계정 규약(`docs/TEST_ACCOUNTS.md`) — dev·에뮬레이터 전용, `npm run seed:test`, 로그인 UI 배선: `[예 / 아니오]`
- [ ] **F6** 승인 도메인에 preview 채널 도메인 추가 (`[project].web.app`, `*.web.app`)
- [ ] **F7** CORS — Storage 파일을 fetch·canvas로 쓸 때만 `cors.json` 적용 (`docs/CORS.md`)
- [ ] **F8** 프로덕션 QA 계정(앱스토어 심사 등)이 필요하면 콘솔 테스트 번호 등록 — `TEST_ACCOUNTS.md` 하단 기록
- [ ] **F9** App Check — 배포가 안정된 뒤 모니터링 모드부터
- [ ] **F10** 소셜 로그인 공급자 1종(작업지시서 ACC — 계약 전 확정) 콘솔에서 사용 설정 — `[공급자 미정]`
- [x] **F11** Blaze 플랜 (네이버 Directions 프록시용 Cloud Functions) — 사용자 확인

## 5. 배포 (Hosting · 도메인)

- [x] **P1** Hosting 연결 (SPA rewrite + 캐시·보안 헤더, CSP에 네이버 지도 도메인) — 사이트: `jeonnam-trip`
- [x] **P2** `.github/workflows/firebase-hosting-deploy.yml` 설치 (PR preview + main live)
- [ ] **P3** GitHub Actions Secret `FIREBASE_SERVICE_ACCOUNT` 등록 + preview 채널 1회 배포
- [-] **P4** 프로덕션 도메인 연결 — `jeonnam-trip.web.app` 기본 도메인 사용 (커스텀 도메인 없음)

## 6. 웹 에셋 · SEO

- [ ] **W1** 마스터 로고 등록 — `web-assets/logo-source/logo.png`(또는 svg)
- [ ] **W2** `/generate-web-assets` 실행 — 파비콘 세트·PWA 아이콘·OG 이미지
- [ ] **W3** index.html 메타(title·description·og:*)와 `<Seo>`의 SITE_NAME이 실제 서비스 문구 + 주요 라우트에 배선
- [ ] **W4** `public/robots.txt` 정책 — `[프로덕션 허용 / 스테이징 차단]`
- [ ] **W5** og:image 절대 URL (P4 도메인 확정 뒤)

## 7. 시크릿 · 보안 (`.secrets/` + `.env.local` — 커밋 금지)

- [x] **S1** `.gitignore`에 `.secrets/`·`.env.local`·`.cache/`·`_workspace/` 포함
- [x] **S2** `VITE_` 변수에 시크릿 없음 (번들에 공개된다 — config·DSN 같은 공개 값만)
- [-] **S3** AI API 키 — AI 기능 없음
- [ ] **S5** 네이버 클라우드 Maps — Client ID는 `.env` `VITE_NAVER_MAP_CLIENT_ID`(공개 값), Directions Client Secret은 `firebase functions:secrets:set`으로만: `[미등록 — 갑 명의 계정, 1차 마일스톤 10/22]`
- [-] **S4** Figma Access Token — `[미등록 — Figma를 쓰게 되면]`

## 8. MCP (등록하면 새 세션부터 보인다)

- [ ] **M1** Firebase MCP — `.mcp.json` 작성 완료. 등록 제품: `firestore, auth, storage` `[새 세션 시작 후 체크]`
- [ ] **M2** (새 MCP를 붙이면 여기에 추가)

## 9. Ops Loop (파일은 항상 설치 · 켜는 건 준비됐을 때)

- [ ] **O1** `[미등록 — 에러 모니터링 착수 시]` `/setup-sentry-autofix` — Sentry 계정·DSN(`VITE_SENTRY_DSN`, 공개 가능 값)·CLI 포함
- [ ] **O2** `/setup-auto-triage` — 이슈·CI 실패 다이제스트
- [ ] **O3** `/setup-perf-monitor` (첫 배포 뒤) — 기준선: `[YYYY-MM-DD: LCP ___ / CLS ___ / TBT ___]`

## 10. 학습 루프 자동화 (선택)

- [x] **L1** `@rule-promoter` 주기 실행 등록 — 수동 (주 1회)
- [x] **L2** `@mistake-compressor` 주기 실행 등록 — 수동 (recent.md 200줄 초과 시)
