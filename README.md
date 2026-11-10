# 머물전남

전남 축제와 가고 싶은 장소를 모아 영업시간과 자동차 이동시간을 계산하고, 최대 3박 4일 여행 일정으로 완성하는 반응형 웹이에요. 관리자 화면도 같은 앱에 들어 있어요.

라이브: https://jeonnam-trip.web.app

## 주요 기능

| 기능 | 내용 |
|---|---|
| 탐색 | 홈에서 날짜·지역을 고르고 축제(목록·달력), 장소, 크리에이터 코스를 둘러봐요. |
| 여행 시작 | 축제·장소(SNS 링크)·크리에이터 코스·직접 만들기 4가지 흐름이 모두 같은 일정 편집 화면으로 이어져요. |
| 일정 편집 | 일차별로 장소를 배치하면 도착 시각과 영업조건 충돌을 계산해 알려 줘요. 사용자가 정한 순서·시각은 바꾸지 않아요. |
| 자동차 경로 | 네이버 Directions(자동차)로 구간 이동시간을 구해요. 도보 경로는 범위 밖이에요. |
| 보관함 | 장소 저장, SNS 링크 저장, 내 여행 목록을 관리해요. 탐색·작성은 비회원도 되고, 보관할 때 로그인해요. |
| 공유 | 공개 시점의 사본을 링크(`/s/:shareId`)로 공유해요. 개인 메모와 출발·종료 위치는 빠져요. |
| 로그인 | 카카오, Google 2종이에요. 앱 안 브라우저(카카오톡 등)에서는 Google 버튼만 잠가요. |
| 다국어 | 화면 문구는 한국어(기본)·영어·일본어, 콘텐츠는 문서별 `i18n` 필드로 번역해요. |
| 관리자 | `/admin`에서 축제·장소·크리에이터 코스를 등록하고 초안 저장·공개·비공개를 관리해요. |

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프런트엔드 | React 19, Vite 8, TypeScript 6, react-router 8 |
| 상태·폼 | TanStack Query 5(서버 상태), Zustand 5(클라이언트 상태), react-hook-form + zod 4 |
| UI | Tailwind CSS 4, shadcn/ui(radix-ui), sonner, motion, Pretendard |
| 다국어 | i18next + react-i18next |
| 백엔드 | Firebase(Auth, Firestore, Storage, Hosting), Cloud Functions(Node 22, asia-northeast3) |
| 외부 API | 네이버 지도 JS v3, 네이버 Directions 5, 카카오 로그인 |
| 테스트 | Vitest + Testing Library(단위), Playwright(스모크 e2e) |
| CI/CD | GitHub Actions(검사·Hosting 배포) |

## 빠른 시작

### 1. 요구 사항

| 항목 | 버전·비고 |
|---|---|
| Node.js | 22.18 이상(CI와 Functions가 Node 22를 써요). Functions 테스트가 `.ts` 파일을 Node로 바로 실행해서, 타입 제거가 기본으로 켜진 22.18부터 돌아가요. |
| Firebase CLI | 전역 설치가 필요해요(`npm i -g firebase-tools`). devDependencies에는 없어요. |
| Java | Firebase 에뮬레이터 실행에 필요해요. |

### 2. 의존성 설치

```bash
npm ci
npm --prefix functions ci
```

### 3. 환경변수

`.env`는 git에 올리지 않아요. 클론한 뒤 `.env.example`을 `.env`로, `functions/.env.example`을 `functions/.env`로 복사하고 값을 채워요. 값은 이전 담당자에게 받거나 각 콘솔(Firebase·네이버 클라우드·카카오 개발자)에서 확인해요. 내 PC에서만 바꿀 값은 `.env.local`(gitignore 대상)에 넣어요.

```bash
cp .env.example .env
cp functions/.env.example functions/.env
```

앱은 `src/lib/env.ts`에서 zod로 값을 검증해요. 필수 값이 빠지면 앱이 시작할 때 "환경변수 누락/오류" 에러를 던져요.

| 변수 | 필수 | 용도 |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | 필수 | Firebase 웹 설정 |
| `VITE_FIREBASE_AUTH_DOMAIN` | 필수 | Firebase 웹 설정 |
| `VITE_FIREBASE_PROJECT_ID` | 필수 | Firebase 웹 설정 |
| `VITE_FIREBASE_STORAGE_BUCKET` | 필수 | Firebase 웹 설정 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 필수 | Firebase 웹 설정 |
| `VITE_FIREBASE_APP_ID` | 필수 | Firebase 웹 설정 |
| `VITE_NAVER_MAP_CLIENT_ID` | 필수 | 네이버 지도 Client ID(웹 서비스 URL로 제한되는 공개 값) |
| `VITE_KAKAO_JS_KEY` | 필수 | 카카오 JavaScript 키(공개 값) |
| `VITE_USE_EMULATORS` | 선택 | 기본 `true`. `false`일 때만 에뮬레이터를 쓰지 않아요. 개발 서버(`npm run dev`)에서만 적용돼요. 빌드 결과물은 이 값과 상관없이 항상 운영 Firebase에 붙어요. |
| `VITE_SENTRY_DSN` | 선택 | 선언만 돼 있고 Sentry는 아직 연동되지 않았어요. |

`VITE_`로 시작하는 값은 번들에 평문으로 들어가요. 시크릿은 절대 넣지 않아요.

Cloud Functions 설정은 따로 있어요.

| 이름 | 종류 | 넣는 곳 | 쓰는 함수 |
|---|---|---|---|
| `NAVER_MAP_CLIENT_ID` | 파라미터(공개 값) | `functions/.env`(예시 파일 복사 후 채움) | `api` |
| `KAKAO_REST_API_KEY` | 파라미터 | `functions/.env`(예시 파일 복사 후 채움) | `authKakao` |
| `NAVER_MAP_CLIENT_SECRET` | 시크릿 | Google Secret Manager | `api` |
| `KAKAO_CLIENT_SECRET` | 시크릿 | Google Secret Manager | `authKakao` |

로컬 함수 에뮬레이터에서 두 시크릿이 필요하면 `functions/.secret.local`(`functions/.gitignore` 대상)에 같은 이름으로 넣어요. 이 파일이 없으면 Secret Manager 접근 권한이 있는 계정으로 `firebase login`해야 해요. 둘 다 없으면 로컬에서 경로 계산(`api`)과 카카오 로그인(`authKakao`)이 실패해요. 값은 담당자에게 따로 받아요.

### 4. 실행

에뮬레이터로 실행하는 것이 기본이에요. 운영 데이터에 닿지 않아요. 터미널을 나눠 순서대로 실행해요.

```bash
npm --prefix functions run build   # functions/lib/ 생성(gitignore 대상). 고치면서 보려면 npx --prefix functions tsc -w
npm run emulators     # Auth 9099, Firestore 8080, Storage 9199, Functions 5001
npm run seed:test     # 에뮬레이터에 테스트 계정 생성
npm run seed:sample   # [샘플] 축제·장소·코스 + 테스트 관리자 등록
npm run dev           # http://localhost:5173
```

- 함수 빌드를 건너뛰면 Functions 에뮬레이터가 `functions/lib/index.js`를 찾지 못해 `api`·`authKakao`가 올라오지 않아요. 배포 때는 `firebase.json`의 predeploy가 빌드해요.
- 로그인 화면에는 카카오·Google 버튼만 있어요. `src/lib/test-auth.ts`(이메일·전화 테스트 로그인)는 아직 어느 화면에도 연결돼 있지 않아서, 시드로 만든 `admin@test.local`로 로그인하는 화면은 없어요.
- 에뮬레이터에서 Google 버튼을 누르면 Auth 에뮬레이터의 가짜 계정 창이 떠요. 그 계정으로 관리자 화면(`/admin`)에 들어가려면 Firestore 에뮬레이터(http://127.0.0.1:4000 의 Emulator UI)에 `admins/{그 계정의 uid}` 문서를 만들어요. 계정 규약은 `docs/TEST_ACCOUNTS.md`를 봐요.
- 개발 서버는 `/api` 요청을 함수 에뮬레이터로 프록시해요.
- `.env.local`에 `VITE_USE_EMULATORS=false`를 넣으면 운영 Firebase에 붙고 `/api`도 운영 사이트로 보내요. 운영 데이터를 직접 읽고 쓰니 조심해요. 이 모드에서는 카카오 로그인이 끝까지 되지 않아요.

### 5. 네이버 지도 주의

네이버 지도는 NCP 콘솔의 Web 서비스 URL에 등록한 도메인에서만 떠요. 등록되지 않은 주소에서는 "지도 인증에 실패했어요" 안내가 나와요. `localhost:5173`과 PR 미리보기 도메인이 등록돼 있는지는 문서와 코드로는 알 수 없어요. 확인하는 곳은 NCP 콘솔 > Maps > Application > Web 서비스 URL이고, 없으면 거기에 추가해요. 지도 동작은 배포 후 라이브에서 확인하는 것이 확실해요.

PR 미리보기 주소에서 로그인하려면 Firebase 콘솔 > Authentication > 승인된 도메인에도 미리보기 도메인을 넣어야 해요.

카카오 로그인도 같아요. 카카오 콘솔에 등록된 리다이렉트 주소에서만 돼요(서버 허용 목록은 `functions/src/kakao-auth.ts`). 서버 허용 목록에는 `http://localhost:5173/auth/kakao/callback`이 있지만, `vite.config.ts` 주석에는 카카오 콘솔에 운영 도메인만 등록돼 있다고 적혀 있어요. 그래서 로컬에서는 카카오 로그인이 끝까지 되지 않는다고 보고 Google 버튼으로 확인해요. 확인하는 곳은 카카오 디벨로퍼스 > 내 애플리케이션 > 카카오 로그인 > Redirect URI예요.

## 자주 쓰는 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 로컬 개발 서버 |
| `npm run build` | 타입 검사 후 프로덕션 빌드(`dist/`). 직전에 웹 에셋 검사를 경고 모드로 돌려요. |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint(`functions/`, `e2e/`는 제외) |
| `npm run typecheck` | 타입 검사 |
| `npm test` | Vitest 감시 모드. 한 번만 돌리려면 `npm test -- --run` |
| `npm run smoke` | Playwright 스모크 테스트. 처음엔 `npx playwright install chromium`. 아래 주의를 봐요. |
| `npm run format` | Prettier 포맷 |
| `npm run check:web-assets` | 파비콘·아이콘·OG·robots 엄격 검사. 배포 전 통과 필수 |
| `npm run emulators` | Firebase 에뮬레이터 |
| `npm run seed:test` / `npm run seed:sample` | 에뮬레이터 시드(테스트 계정 / 샘플 콘텐츠) |
| `npm --prefix functions test` | Functions 단위 테스트 |
| `npm --prefix functions run build` | Functions 빌드(`functions/lib/`) |

로컬 `npm run smoke`는 로컬 `.env`로 프로덕션 빌드를 만들어 4173 포트에서 돌려요. 프로덕션 빌드는 에뮬레이터에 붙지 않아서 운영 Firebase를 읽어요. `localhost:4173`은 네이버 지도에 등록되지 않은 주소라 지도 인증 에러로 테스트가 떨어질 수도 있어요. 운영에 닿지 않게 돌리려면 CI(`.github/workflows/react-ci.yml`의 smoke 잡)처럼 `VITE_FIREBASE_*`·`VITE_NAVER_MAP_CLIENT_ID`를 스텁 값으로 덮어써서 실행해요.

`scripts/`의 `crawl-namdo-*.mjs`, `fill-festival-photos.mjs`, `apply-translations.mjs`는 운영 Firestore·Storage에 직접 쓰는 스크립트라 npm 스크립트에 넣지 않았어요. 기본은 dry-run이고 `--write`를 줘야 반영해요. 운영에 쓰려면 `GCP_TOKEN` 환경변수(`gcloud auth print-access-token`으로 받아요)가 필요하고, 수집 스크립트의 주소→좌표 지오코딩에는 `NCP_ID`·`NCP_SECRET` 환경변수가 필요해요. `crawl-namdo-*.mjs --write`는 문서를 통째로 덮어써서 `i18n` 필드가 지워져요. 수집을 다시 돌렸다면 `apply-translations.mjs --write`도 다시 실행해요. 자세한 실행 방법은 [docs/handover/02_빌드배포_절차서.md](docs/handover/02_빌드배포_절차서.md)를 봐요.

## 폴더 구조

```text
src/
  app/              라우터(router.tsx), 경로 상수(paths.ts), 레이아웃, 인증 가드
  features/         기능별 폴더: components/ hooks/ api/ lib/ pages/ index.ts(필요한 것만)
    explore/        탐색 홈
    festivals/      축제 목록·달력·상세
    places/         장소 목록·상세
    library/        보관함·SNS 링크
    creators/       크리에이터 코스
    planner/        여행 시작·코스 편집·시간 계산
    trips/          코스 저장(버전 비교)·로그인 전 초안
    map/            네이버 지도·자동차 경로
    account/        로그인·내 여행·공유
    admin/          관리자 화면
  shared/domain/    Firestore 컬렉션 이름·타입 단일 출처
  lib/              env.ts, firebase.ts, i18n.ts 등 공용 설정
  locales/          ko·en·ja 화면 번역
  styles/tokens.css 디자인 토큰
functions/src/      Cloud Functions(api: 경로 프록시, authKakao: 카카오 로그인)
scripts/            시드·수집·번역 반영·웹 에셋 검사 스크립트
e2e/                Playwright 스모크 테스트
firestore.rules · storage.rules · firestore.indexes.json · firebase.json
```

레이어는 `Page → hooks → api → Firebase` 순서로만 의존해요. Firebase 호출은 각 기능의 `api/`에서만 하고, 다른 기능은 `index.ts`로 공개된 것만 가져다 써요. `index.ts`가 없는 기능(account·admin·explore)은 라우터(`src/app/router.tsx`)만 페이지를 불러 쓰고, 다른 기능은 가져다 쓰지 않아요.

## 배포

| 대상 | 방법 |
|---|---|
| Hosting(라이브) | `main`에 push하면 GitHub Actions가 라이브 채널에 배포해요. |
| Hosting(미리보기) | `main` 대상 PR을 열면 7일 동안 유지되는 미리보기 채널에 배포하고 PR 코멘트에 주소를 남겨요. |
| Firestore·Storage 규칙, 인덱스, Functions | 자동 배포되지 않아요. firebase CLI로 직접 배포해요. |

수동 배포 전에 갖춰야 할 것이에요.

- `firebase login`으로 `jeonnam-trip` 프로젝트 권한이 있는 계정에 로그인해요.
- Functions 배포에는 Blaze 요금제가 필요해요(현재 Blaze예요).
- 시크릿 두 개가 Secret Manager에 있어야 해요. 새로 넣거나 바꿀 때는 `firebase functions:secrets:set NAVER_MAP_CLIENT_SECRET`, `firebase functions:secrets:set KAKAO_CLIENT_SECRET`(둘 다 `--project jeonnam-trip`)을 실행하고, 값은 프롬프트에 입력해요.
- `authKakao`는 기본 Compute 계정이 아니라 Firebase Admin SDK 서비스 계정으로 실행돼요(`functions/src/index.ts`의 `KAKAO_RUNTIME_SA`). 커스텀 토큰 서명에 쓰므로 이 계정에 '서비스 계정 토큰 생성자' 역할이 있어야 해요.

수동 배포 예시예요.

```bash
npm run check:web-assets
npm run build
firebase deploy --only hosting --project jeonnam-trip
firebase deploy --only firestore:rules,firestore:indexes,storage --project jeonnam-trip
firebase deploy --only functions --project jeonnam-trip
```

배포 워크플로우는 저장소 Secret `FIREBASE_SERVICE_ACCOUNT`와 저장소 Variables(`VITE_FIREBASE_*` 6종, `VITE_NAVER_MAP_CLIENT_ID`, `VITE_KAKAO_JS_KEY`, 선택 `VITE_SENTRY_DSN`·`SITE_URL`)를 써요. `.env`는 레포에 없으니 배포 빌드 값은 모두 Variables에서 와요.

시크릿 등록, 서비스 계정, 첫 배포, 장애 점검 같은 자세한 절차는 [docs/handover/](docs/handover/)의 빌드·배포 절차서를 봐요.

## 브랜치

| 브랜치 | 상태 |
|---|---|
| `main` | 라이브 기준이에요. push하면 바로 라이브에 배포돼요. |
| `claude/mokpo-brand-color` | `main`에 합쳐진 이전 라이브 작업 브랜치예요. 앞으로는 `main`에서 작업해요. |
| `claude/i18n` | 다국어 작업 브랜치예요. 내용은 모두 `claude/mokpo-brand-color`에 들어가 있어서 지워도 돼요. |
| `claude/full-service-redesign` | 갈라진 옛 계열이에요(PR #1, 닫힘). 카카오 로그인과 다국어가 없어서 머지하면 라이브 기능이 되돌아가요. 머지하지 않아요. |

새 작업은 `main`에서 브랜치를 만들고 PR로 합쳐요. PR을 열면 CI(포맷·lint·타입·테스트·빌드·스모크)가 돌아요. Functions 테스트와 빌드는 CI에 없어요. `functions/`를 고쳤다면 로컬에서 `npm --prefix functions test`와 `npm --prefix functions run build`를 돌려요.

## 문서 안내

| 문서 | 내용 |
|---|---|
| [docs/handover/](docs/handover/) | 인수인계 문서: 운영 가이드, 빌드·배포 절차서 |
| [docs/data-model.md](docs/data-model.md) | Firestore 컬렉션·권한·Storage 경로·기능 폴더 표 |
| [docs/setup-checklist.md](docs/setup-checklist.md) | 연결된 외부 서비스와 남은 설정 항목 |
| [docs/CORS.md](docs/CORS.md) | Storage 버킷 CORS 적용 방법 |
| [docs/TEST_ACCOUNTS.md](docs/TEST_ACCOUNTS.md) | 에뮬레이터 테스트 계정 규약 |
| [docs/DESIGN.md](docs/DESIGN.md) | 디자인·톤앤매너 |
| [docs/proposal/](docs/proposal/) | 기획 문서: 제안요청서, 요구사항정의서, 기능명세서, 서비스기획서, 화면설계서 |
| [CLAUDE.md](CLAUDE.md) | AI 에이전트(Claude Code)가 지키는 규칙·아키텍처·배포 설정 요약 |
| [knowledge/](knowledge/) | 상세 규칙(rules.md), 패키지 목록, 겪은 함정, 디자인 토큰. 시작점은 INDEX.md |

`knowledge/rules.md` 일부(다국어 절)는 실제 코드보다 오래된 내용이 있어요. 코드와 다르면 코드를 기준으로 봐요.
