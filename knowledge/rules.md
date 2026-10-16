# 규칙 베이스

이 파일은 두 종류의 규칙을 포함:
1. **초기 기본 규칙** — 설치 시부터 적용되는 아키텍처·디자인·UI 원칙 (2026-07 프로덕션 리서치 기반)
2. **승격된 규칙** — recent.md에서 3회 이상 반복 → @rule-promoter 제안 → 사람 검토 후 추가

**사람만 수정**. 에이전트는 읽기만.

작업 시 섹션별 grep으로 필요한 부분만 로드.

## 규칙 메타데이터 포맷

승격 규칙 앞에 아래 주석을 붙임. @rule-promoter가 자동 삽입, @rule-deprecator가 verified 날짜 기준 판단.

```
<!-- rule: YYYY-MM-DD, source: mistakes/recent.md#줄번호, verified: YYYY-MM-DD -->
- 규칙 내용
```

- `rule`: 최초 승격일
- `source`: 근거가 된 recent.md 항목 식별자
- `verified`: @rule-deprecator가 마지막으로 유효성 확인한 날짜 (6개월 초과 시 재검토 대상)

**대조쌍 권장 형식**: 추상적인 규칙(훅이 기계 차단하지 못하는 것)은 위반 예(❌)/수정 예(✅) 코드
1쌍을 함께 적는다 — v0/Lovable/Bolt 공통 골격("규칙 1개 = 대조쌍 1개가 최소 단위"). 산문만 있는
규칙은 행동 고정력이 약하다.

---

## 컴포넌트·패키지 우선 (바퀴를 다시 발명하지 않는다)

프로덕션 UI·기능은 **검증된 컴포넌트·패키지를 조합**해 만든다 — 손수 재구현은 접근성(ARIA·포커스·
키보드)·엣지케이스(RTL·IME·collision)·유지보수·보안의 숨은 비용을 전부 떠안는 일이다. "이거
접근성·엣지케이스 있나?"를 물어야 하는 위젯이면 십중팔구 shadcn/표준 패키지가 이미 있다.

**리치포 맵·shadcn 카탈로그·안티패턴 표는 `knowledge/packages.md`가 소유** (단일 출처). UI를 짜기 전
그 파일을 먼저 본다.

### 패키지 채택 정책 (새 패키지 추가 전 순서대로 통과)
1. **이미 커버되는가? (STOP 우선)**
   - shadcn 카탈로그(packages.md)에 있는가? → `npx shadcn@latest add <이름>`. 새 패키지 금지.
   - 스택 확정 표(packages.md)로 해결되는가? → 그걸 쓴다 (서버상태=Query·클라=Zustand·폼=RHF/zod·
     애니=motion·아이콘=프로젝트 SVG 세트(@/components/icons)·날짜=date-fns·차트=recharts·포맷=Intl). 대체 라이브러리 추가 금지.
   - 10~30줄 유틸이면 직접 작성 + 유닛테스트.
2. **안정성 검증** (전 항목): 주간 다운로드 상위권 · 최근 6개월 릴리스 · bundlephobia 크기 · TS-native ·
   ESM/tree-shakeable · React 19 peer 지원 · MIT/Apache · transitive deps 최소.
3. **번들 예산**: 단일 패키지 +30kB(gzip) 이상이면 라우트 lazy load 또는 대안. Tiptap·PDF·지도류 대형은
   **반드시 lazy load** (rules.md § 빌드/배포 성능 예산).
4. **사람 승인 에스컬레이션**: 게이트 1~3 통과해도 **런타임 의존성(dependencies) 신규 추가는 사람 승인**.
   (a) 왜 기존 스택으로 안 되는지 (b) 후보의 버전·주간다운로드·gzip·라이선스·최근 릴리스 (c) 대안 1~2개를
   표로 제시하고 승인 요청. devDependencies는 동일 검증 적용하되 상대적으로 자유.

한 줄 요약: **shadcn에 있으면 add, 스택에 있으면 그걸, 10줄이면 직접, 그 외 새 런타임 의존성은 검증표와
함께 사람에게 물어라.**

---

## 구현 완결성 (프로덕션 기준 — 이 스타터의 존재 이유)

이 스타터로 만드는 건 **프로덕션 서비스**다 — MVP·프로토타입·데모가 아니다. 기능을 "화면만
그럴듯하게"가 아니라 **끝까지 동작하게** 구현한다. 아래 상태를 모두 처리해야 그 기능은 "완료"다:

- **정상(happy path)**: 핵심 동작이 실제로 끝까지 수행됨 (목업 응답이 아니라 실제 연동)
- **로딩**: 비동기 동안 스켈레톤/스피너, 제출 버튼은 중복 클릭 방지 disabled
- **에러**: 실패 시 사용자向 한국어 메시지 + 복구 경로(재시도 등). 조용한 실패·빈 catch 금지
- **빈 상태(empty)**: 데이터 0건일 때 안내 UI — 빈 리스트를 그냥 두지 않기
- **엣지**: 권한 없음·네트워크 끊김·긴 텍스트·항목 과다 등 (unknown-unknowns 참조)

**금지 (프로토타입식 미완성)**:
- 프로덕션 경로에 목업/더미/하드코딩 데이터로 화면만 채우기
- `// TODO: 구현` 주석만 남기고 완료 보고
- 스텁 함수(빈 body·항상 성공 반환)를 실경로에 연결
- 로딩·에러·빈 상태를 "정상 케이스만 되면 됐지"로 생략

**예외·에스컬레이션**: 사용자가 **명시적으로** "일단 목업만"·"스켈레톤만" 등 부분 구현을 지시하면
그 범위까지만 하되, 미구현 지점을 완료 보고에 반드시 명시한다. 스펙이 특정 상태(에러·엣지)를
안 다루면 스텁하지 말고 **합리적 기본 처리**(한국어 에러 메시지 + 재시도, 빈 상태 안내)로 구현한 뒤 완료 보고에 가정으로 적는다.
결정론 백스톱: 빈 콜백은 훅이, "렌더는 되나 미연결"(Potemkin)은 e2e 스모크가 잡는다.

---

## 아키텍처
(아직 승격된 규칙 없음. 아래는 CLAUDE.md 상세 버전)

### 레이어 구조 (얇은 레이어)
- Presentation: features/[기능]/components/ + 라우트 페이지
- Data: features/[기능]/api/ (repository) + types.ts
- 비즈니스 로직은 hooks/(TanStack Query 훅·Zustand 스토어) 안에
- Domain 레이어·UseCase 클래스 생성 금지 — 함수·훅으로 충분

### 의존 방향
- Page(컴포넌트) → hooks → api(repository) → Firebase/AI
- 역방향 금지
- 컴포넌트에서 api/ 직접 호출 금지 (반드시 훅 경유)
- 훅에서 Firebase SDK 직접 호출 금지 (반드시 api/ 경유)

### Repository(api/) 규칙
- feature별 자체 api/ 폴더 — Firebase·AI 코드는 여기에만
- 함수 단위로 export (클래스·추상 인터페이스 만들지 않음)
- 테스트는 vi.mock으로 api/ 모듈 모킹 또는 Firebase 에뮬레이터 사용
- Firestore 문서 ↔ 앱 타입 변환(converter)은 api/에서 처리 — 컴포넌트에 DocumentSnapshot 노출 금지

---

## 모듈 경계

| 디렉토리 | 규칙 |
|---------|------|
| src/features/[기능]/ | 다른 기능에서 직접 import 금지 (index.ts 공개 API만) |
| src/features/[기능]/api/ | Firebase·AI 호출은 여기서만 |
| src/features/[기능]/hooks/ | TanStack Query 훅·로컬 훅. Firebase SDK 직접 호출 금지 |
| src/components/ui/ | 공용 컴포넌트 (shadcn/ui 패턴). README.md 먼저 확인. `npx shadcn@latest add`·아이콘 import 교체·새 variant 추가·README 등록은 승인 없이. 손으로 만든 새 컴포넌트·기존 variant 모양 변경만 에스컬레이션 |
| src/styles/ | 디자인 토큰 (tokens.css). 사용자가 요청한 색·값은 용도 토큰 추가·값 조정으로 허용(라이트/다크 쌍), 위계·스케일·폰트 체계 변경은 에스컬레이션 |
| src/lib/ | firebase.ts·query-client.ts·env.ts·utils 등 공용 인프라. 새 공용 유틸 추가는 진행(보고), 기존 단일 지점의 설정 변경(Firebase·환경변수)은 에스컬레이션 |
| src/app/ | 라우터·프로바이더·전역 에러 바운더리 |
| src/stores/ | 전역 Zustand 스토어 (feature 전용은 feature 안에) |
| docs/ | 에이전트: questions·insights·proposals에 append, DESIGN.md에 승인된 브리프 기록. 그 밖은 사람 |
| knowledge/ | 에이전트: mistakes/(recent append·archive 압축)만. 그 밖은 사람 |
| functions/ | Cloud Functions (모노레포) — 배포는 firebase deploy, 앱 규칙과 별개 |
| firestore.rules / storage.rules | 클라이언트 연산 변경과 **같은 커밋**으로만 수정 |

---

## 상태관리 (TanStack Query + Zustand — 서버/클라이언트 분리)

- **서버 상태는 TanStack Query v5만** — Firestore 읽기·API 호출 결과를 useState/Zustand에 복사 저장
  금지 (이중 캐시 = stale 버그의 근원). useEffect+fetch 조합 신규 도입 금지.
- **클라이언트 상태는 Zustand v5만** (모달 열림·사이드바·선택 상태 등). Redux·Context 전역 상태 신규
  도입 금지 (Context는 테마 같은 저빈도 값 전용).
- 로컬 상태는 useState가 1순위 — 공유가 필요해질 때만 승격.
- **queryKey는 feature별 keys 상수 객체로 중앙 관리** (`todoKeys.list(filter)` 패턴) — 문자열 즉석
  조립 금지 (invalidate 누락의 근원).
  - ❌ `useQuery({ queryKey: ["todos", filter], ... })` (화면마다 즉석 조립)
  - ✅ `useQuery({ queryKey: todoKeys.list(filter), ... })` (keys 상수 경유)
- mutation 후 관련 쿼리 invalidateQueries 필수. 낙관적 업데이트는 onError 롤백까지 한 세트.
- Firestore 실시간(onSnapshot)이 꼭 필요한 화면만 구독 훅 사용 — 구독 결과를
  `queryClient.setQueryData`로 주입하거나 전용 훅으로 분리, 나머지는 getDocs+useQuery.
- staleTime 기본 30초 이상 권장 (기본 0은 과다 리페치) — 값 변경은 lib/query-client.ts 한 곳에서.

---

## 라우팅 (React Router v7 표준 — 안정 우선)

- 모든 라우트는 `src/app/router.tsx` **한 파일**에 정의. 경로 문자열은 `src/app/paths.ts` 상수로 관리
  — 컴포넌트에서 `'/detail/3'` 하드코딩 금지, `paths.detail(id)` 헬퍼 사용.
- 인증 가드는 라우트 트리의 **가드 레이아웃(ProtectedRoute) 한 곳**에서만 — 화면별 if-navigate 금지.
- 라우트 단위 코드 스플리팅 필수: `React.lazy` + Suspense (전 페이지를 한 번들에 넣지 않는다).
- 상세 화면은 URL 파라미터로 열 수 있게 (`/notice/:id`) — location.state는 새로고침·딥링크에서
  사라지므로 식별자 전달용으로 금지 (캐시 힌트로만).
  - ❌ `navigate("/notice", { state: { id } })` → 상세에서 `state.id` 사용
  - ✅ `navigate(paths.noticeDetail(id))` → 상세가 `useParams()`로 스스로 조회
- 경로는 kebab-case. 404(catch-all)·에러 라우트 필수.
- TanStack Router 도입(타입 세이프 라우팅·검색 파라미터 헤비 대시보드)은 에스컬레이션 후 결정.

### SEO (라우트별 메타)
- 라우트별 title/description/OG는 `<Seo>`(`src/components/Seo.tsx`)로 — React 19 네이티브 metadata라
  react-helmet 불필요. 라우트 컴포넌트 최상단에 `<Seo title="..." description="..." />` 한 줄.
- **인증 뒤 화면·비공개 페이지는 `<Seo noindex />`** — 검색 노출 금지.
- `index.html`의 기본 메타는 폴백(첫 페인트·크롤러), `public/robots.txt`는 크롤링 정책 소유
  (스테이징·미출시는 `Disallow: /`). 파비콘·OG 이미지는 `/generate-web-assets`가 생성.
- **배포 전 웹 에셋 게이트** — 파비콘·앱 아이콘·매니페스트·OG 이미지·크롤 허용은 `scripts/check-web-assets.mjs`가
  기계적으로 검사한다. `npm run build` 전(prebuild)에 경고, 호스팅 배포 직전(훅 `check-deploy-web-assets.sh`·배포 CI)에는
  실패 시 배포를 막는다. 막히면 `/generate-web-assets`로 해결 — 검사를 끄거나 우회하지 않는다.
- **Google 검색 결과 아이콘(파비콘) 기준**: `index.html` 원본 HTML에 `<link rel="icon">` (JS로 넣지 않음) ·
  정사각형 · **ICO/PNG 형식으로 48×48보다 큰 것**(SVG는 Google 지원 형식 목록에 없음 — ICO/PNG를 SVG보다 먼저) ·
  Googlebot/Googlebot-Image 크롤 허용 · URL 고정. 반영은 며칠~몇 주 — 새 사이트·아이콘 교체 후엔 Search Console
  URL 검사에서 홈페이지 색인 생성을 요청한다.
- 라우트 전환 시 `document.title` 갱신·스크롤 복원·포커스 이동은 공통 레이아웃에서 (unknown-unknowns #38).

---

## 디자인

### 디자인 토큰 (하드코딩 금지)
| 종류 | 사용법 | 참조 파일 |
|------|--------|----------|
| 색상 | Tailwind 시맨틱 클래스(bg-background·text-foreground·bg-primary...) — CSS 변수 기반 | src/styles/tokens.css |
| 타이포 | text-xs~text-2xl 스케일 (크기 임의값 금지) | Tailwind 기본 스케일 |
| 폰트 | --font-sans = Pretendard Variable (교체는 이 변수 하나) | src/styles/tokens.css |
| 간격 | Tailwind 스케일(p-1~p-8 = 4px 단위)만 — 임의값 p-[13px] 금지 | tailwind 기본 스케일 |
| 라운드 | rounded-{sm,md,lg,xl} — --radius 변수 기반 | src/styles/tokens.css |
| 그림자 | shadow-{sm,md,lg} (Tailwind 기본) — 임의값 금지 | Tailwind 기본 스케일 |

"전체 radius 변경"·"폰트 교체"·"브랜드 색 변경" 같은 요청 = tokens.css 한 곳만 수정 (화면 코드 불변).

### 색상 위계 (스키마 고정 — shadcn/ui 관례)
background/foreground · background-subtle · card · popover · primary · secondary · muted · accent ·
destructive · success · warning · border · input · ring.

**배경색**: 페이지·섹션·영역 배경은 **흰색(`bg-background`, #ffffff)이 기본**. 회색 배경이 필요하면 **`bg-background-subtle`
(#f9f9f9) 하나만** 쓴다 — `bg-muted`·`bg-secondary`·`bg-accent`는 배지·호버·스켈레톤 같은 컴포넌트 상태용이라 영역 배경으로 쓰지
않는다. 회색 영역 위의 카드·입력창은 흰색(`bg-card`·`bg-background`)으로 띄운다.
  - ❌ `<main className="bg-muted">` · `<section className="bg-secondary">` · `bg-gray-50`(훅 차단)
  - ✅ `<main className="bg-background">` · `<section className="bg-background-subtle">`
새 색이 필요하면 맞는 위계가 있으면 그 값을 조정하고, 없으면 용도 이름 토큰(`--cta`+`--cta-foreground`)을 `tokens.css`에 추가한다 — 화면에서 `#hex`,
`text-[#...]`, `bg-[oklch(...)]` arbitrary value 직접 사용 금지 (**훅이 차단**).
모든 색은 `:root`(라이트)와 `.dark`(다크) **쌍으로 정의 필수**.

### 팔레트 정량 상한 (v0 검증 규칙)
- **팔레트는 총 3~5색(hue 기준)** — 브랜드 1 + 뉴트럴 1~2(배경·보더·뮤티드 계열) + 액센트 0~2.
  시맨틱 상태색 3종(destructive/success/warning)은 카운트 예외(단, 상태 표시 외 용도 사용 금지).
  에이전트가 스스로 5색을 넘기지 않는다 (사용자가 요청한 색 때문에 넘으면 아래처럼 진행하고 보고).
- **사용자가 특정 요소의 색을 명시 요청하면 멈추지 않는다** — 맞는 시맨틱 토큰이 있으면 그걸 쓰고, 없으면 tokens.css에
  용도 이름 토큰(예: `--cta` + `--cta-foreground`, 라이트/다크 쌍 + `@theme` 등록)을 추가하거나 `--primary` 값을 조정해
  진행한다. 상태색(destructive 등)을 상태 표시 외 용도로 빌려 쓰지 않는다. 5색 상한을 넘게 되면 완료 보고에 적는다.
- **사용자가 명시 요청하지 않는 한 보라·인디고·기본 블루를 주조색으로 쓰지 않는다** —
  LLM이 기본으로 고르는 색이라 "AI가 만든 티"의 대표 신호다. 브랜드색은 반드시 프로젝트에서 결정.
- **콘트라스트 페어**: `bg-{토큰}`을 지정·변경하면 반드시 대응 `text-{토큰}-foreground`를 함께
  지정한다 — 상속에 기대지 않기 (흰 배경에 흰 글씨가 AI 생성의 알려진 실패 모드).
  - ❌ `<div className="bg-primary">저장</div>`
  - ✅ `<div className="bg-primary text-primary-foreground">저장</div>`

### 금지 비주얼 (AI 티 방지 블랙리스트 — v0 검증 규칙)
- **그라디언트 기본 금지** — 사용자가 명시 요청할 때만. 허용 시에도 유사색(analogous)만,
  스탑 2~3개, 반대 색온도 혼합(핑크→그린 등) 금지.
- **채움용 장식 요소 금지** — 블러 원, 그라디언트 blob, 추상 도형으로 빈 공간을 채우지 않는다.
  빈 공간은 여백으로 두는 것이 정상.
- **이모지를 아이콘 대용으로 사용 금지** — 아이콘은 프로젝트 SVG 세트만 (§ 아이콘 규칙).
- **복잡한 일러스트를 SVG path로 손제작 금지** — 자리는 여백으로 두고 완료 보고에 "일러스트 에셋 필요"를 적는다.
  (§ 아이콘 규칙의 24×24 브랜드 아이콘 제작과는 별개 — 아이콘은 허용, 일러스트가 금지 대상.)

### 타이포 위계 (필수)
- 텍스트 크기는 Tailwind 스케일(text-xs~)만 — `text-[13px]`·`text-[0.8rem]` 등 임의값 금지(**훅 차단**).
- **최소 폰트 크기 12px** — text-xs(12px) 미만 금지. inline style fontSize도 동일(**훅 차단**).
- font-family 직접 지정 금지 — tokens.css의 --font-sans가 소유.

### 모션 (Motion/구 Framer Motion — 절제된 애니메이션)
- 애니메이션 라이브러리는 **`motion` 하나로 고정** (`import { motion } from "motion/react"` — Framer
  Motion 개명판). duration·easing·variants는 `src/lib/motion.ts` 프리셋만 재사용 — 화면마다 즉석
  값(`duration: 0.6` 등) 금지 (디자인 토큰과 같은 원리).
- **역할 분담**: 컴포넌트 진입/퇴장(Dialog·Dropdown 등)은 shadcn/ui + Radix 내장 CSS 애니메이션이
  소유. Framer Motion은 **커스텀·오케스트레이션 애니메이션**(목록 stagger, 페이지 전환, 제스처)만.
- **절제 원칙** (rules.md § 금지 비주얼과 한 세트): 과한 애니메이션은 "AI 티"다. 기본 duration 0.15~0.4s,
  이동은 8px 내외. 화면 진입마다 요소가 튀어오르는 연출 금지 — 의미 있는 전환에만.
- **접근성 필수**: `useReducedMotion()`으로 prefers-reduced-motion을 존중 (tokens.css가 CSS 레벨에서도
  차단하지만, JS 애니메이션은 이 훅으로 별도 처리). 감속 사용자에겐 opacity만 또는 무애니메이션.

### 다국어 (한국어 기본, 확장 대비)
- react-i18next + typed resources(`i18next.d.ts`)가 설치 시부터 세팅됨 — 공용 문구(닫기/저장/삭제
  등)는 `src/locales/ko/common.json`에 추가해 재사용.
- 화면 전용 문구는 당분간 한국어 리터럴 허용(개발 속도) — 다국어 출시가 확정되면 리소스로 이관.

### 컴포넌트 재사용 (shadcn/ui 패턴)
- 공용 UI는 `src/components/ui/` (Button·Input·Dialog·Card·Toast 등 Radix 기반) — 새 위젯을 만들기
  전 README.md 카탈로그 확인, 이미 있으면 재사용.
- 비슷한 형태가 3번째 등장하면 완료 보고에 "ui/ 승격 후보"로 적는다 (매번 재생성 = 화면 간 불일치 + 토큰 낭비).
- 버튼·입력창의 시각 변형은 컴포넌트의 variant prop(cva)이 소유 — 화면에서 className으로 색·크기
  재정의 금지. 새 변형이 필요하면 variant를 추가하고 보고한다 (기존 variant 모양을 바꾸는 것만 에스컬레이션).

### 아이콘 규칙 (스타일 통일)
- **기본 아이콘 팩 금지 — 아이콘은 제품 컨셉에 맞게 새로 그린다.** lucide-react·react-icons·heroicons 등은 쓰지 않는다
  (**훅·lint·끝내기 전 검사가 차단**). 다른 서비스와 똑같은 아이콘이 "AI가 만든 기본 화면" 인상을 만든다.
- 모든 아이콘은 `src/components/icons/`의 프로젝트 SVG 세트 — `createIcon`으로 만들고 `@/components/icons`에서 가져온다.
  크기·선 두께·끝 모양은 `icon-style.ts` 하나가 소유 (화면에서 strokeWidth 등을 넘기지 않는다). 화면 코드에 인라인 `<svg>` 금지(훅 차단).
- 필요한 아이콘이 없으면 **멈추지 말고 새로 그린다** — `src/components/icons/README.md`의 스타일 가이드·그리드 규칙대로, 같은 뜻의
  아이콘이 이미 있는지 목록부터 확인. 다른 아이콘 팩의 path 복사 금지 (라이선스·컨셉 불일치).
  - ❌ `import { Trash2 } from "lucide-react"` · `<svg viewBox="0 0 24 24">…</svg>`를 화면 컴포넌트에 직접
  - ✅ `src/components/icons/delete-icon.tsx`에 `export const DeleteIcon = createIcon("DeleteIcon", <>…</>)` → `import { DeleteIcon } from "@/components/icons"`
- `npx shadcn@latest add`로 들어온 컴포넌트가 lucide를 import하면(sonner·dialog·select 등) 같은 작업 안에서 프로젝트 아이콘으로 바꾼다
  (없으면 새로 그림) — shadcn CLI는 편집 훅을 거치지 않으므로 끝내기 전 검사가 잡는다. `lucide-react` 패키지는 shadcn CLI가
  다시 설치할 수 있어 남아 있어도 되지만, import는 0이어야 한다.
- 장식용 아이콘 금지 — (1) 보편 기호가 있어 텍스트보다 빠르게 지각될 때, (2) 공간 제약, (3) 목록 유형 반복 구분에만 사용.
- 아이콘만 있는 버튼은 버튼에 aria-label 필수. 아이콘 혼자 뜻을 전하면 `label` prop (스크린리더용), 옆에 글자가 있으면 생략(장식).

### 모달·다이얼로그·토스트 (공용 컴포넌트 강제)
- **다이얼로그**: window.alert/confirm/prompt 직접 호출 금지 — `src/components/ui/`의 공용
  Dialog/AlertDialog만 사용 (포커스 트랩·ESC·오버레이 처리를 래퍼가 소유).
- **토스트**: 공용 Toast(sonner 등 1개로 고정)만 — 화면별 알림 UI 자작 금지.
- **페이지 뼈대**: 공통 레이아웃(헤더·사이드바·max-width·패딩)은 layout 컴포넌트로 — 화면마다
  손으로 조립하지 않는다.
- 필요한 래퍼가 ui/에 아직 없으면: feature 안에서 임시로 만들지 말고 **`npx shadcn@latest add alert-dialog`(확인창)·
  `sonner`(토스트)·`dialog` 등으로 바로 추가**한다 — 승인 불필요 (packages.md 리치포 맵 표준 채택). 카탈로그에 없는
  래퍼를 손으로 만들어야 할 때만 에스컬레이션.
- 이 규칙은 `.claude/hooks/check-ui-rules.sh` 훅이 결정론적으로도 검사한다 (어기면 즉시 피드백).

---

## UI

### 레이아웃 방법 서열 (v0 검증 규칙)
- **Flexbox 1순위** (`flex flex-col gap-*`), **Grid는 진짜 2차원 레이아웃**(카드 그리드·대시보드)에만.
- **float 금지, absolute는 최후 수단** — 오버레이·배지·닫기 버튼 같은 국소 용도만. absolute로 페이지
  레이아웃을 잡는 순간 반응형이 깨진다.
- **모바일 퍼스트**: 기본 스타일 = 모바일, `sm:`/`md:`/`lg:`로 확장. 데스크톱 먼저 만들고
  모바일을 "고치는" 순서 금지.
- 간격은 margin 개별 지정보다 부모의 `gap`/`space-y` 우선 (형제 간 간격 일관성).

### 본문 타이포 수치 (v0 검증 규칙)
- 본문 행간 1.4~1.6 — `leading-normal`(1.5)~`leading-relaxed` 범위만.
- 제목·중요 카피는 `text-balance`(제목) 또는 `text-pretty`(문단)로 줄바꿈 품질 확보.

### 네이밍
- 파일: 컴포넌트 PascalCase.tsx(또는 kebab-case.tsx — 프로젝트 시작 시 하나로 고정), 그 외 kebab-case
- 컴포넌트/타입: PascalCase
- 변수/함수/훅: camelCase (훅은 use 접두사)
- bool: is/has/can 접두사
- 상수: UPPER_SNAKE_CASE

### Feature 디렉토리
```
src/features/[기능]/
├── components/
├── hooks/
├── api/
├── types.ts
└── index.ts     # 공개 API
```

### 금지
- `any` 남용 (`unknown` + 좁히기 사용), `@ts-ignore`(불가피하면 `@ts-expect-error` + 사유 주석)
- console.log 잔존 (디버깅 후 제거 — 운영 에러는 Sentry(`src/lib/sentry.ts`)로)
- 하드코딩 색상·크기·radius·shadow (임의 Tailwind arbitrary value 포함)
- Firebase·AI를 컴포넌트·훅에서 직접 호출
- features 간 직접 import
- `dangerouslySetInnerHTML` (불가피하면 DOMPurify sanitize + 에스컬레이션)
- 사용자 제공 URL을 href에 그대로 — `javascript:` URI는 React가 막아주지 않는다.
  `new URL()` 파싱 후 http/https 화이트리스트 필수
- **동작 없는 버튼·클릭 영역**: 빈 핸들러(`onClick={() => {}}`) 금지, TODO만 있는 핸들러 금지.
  기능이 아직 없으면 (a) 렌더하지 않거나 (b) disabled 명시 (c) 스펙 문제면 에스컬레이션.
  "일단 UI만" 금지 — 눌러도 아무 일 없는 요소는 사용자에겐 버그다.
- div/span에 onClick만 달아 버튼 흉내 금지 — button 요소 또는 role+키보드 핸들러 (a11y)
- useEffect로 파생 상태 계산 금지 — 렌더 중 계산 또는 useMemo (Effect는 외부 시스템 동기화 전용)
  - ❌ `useEffect(() => { setTotal(items.reduce(...)); }, [items])`
  - ✅ `const total = items.reduce(...)` (렌더 중 계산, 비싸면 useMemo)
- index를 key로 사용 금지 (정렬·필터 목록에서 상태 뒤섞임)

### 제한
- 컴포넌트 파일: 300줄 이하 (초과 시 분리)
- 훅: 150줄 이하
- 컴포넌트 JSX 반환부: 80줄 이하 권장 (초과 시 하위 컴포넌트 추출)

---

## 톤앤매너

키워드·문체(해요체/합쇼체)는 CLAUDE.md § 제품 톤앤매너가 단일 출처 (프로젝트 톤에 맞게 채워야 함). 상세
가이드는 docs/DESIGN.md. 의심 시 기존 앱 내 카피와 일관성 확인 — **같은 행동은 항상 같은 표현**("리뷰 쓰기"를
다른 화면에서 "리뷰 작성하기"로 돌려 쓰지 않기, 라포랩스 원칙).

---

## 한국어 카피 (AI 티 방지 블랙리스트 — 언어판, 2026-09 웹 리서치)

§ 금지 비주얼이 "AI가 만든 화면"의 시각 신호를 막듯, 이 절은 "AI가 쓴 문구"의 언어 신호를 막는다. 대상은
**제품 안의 한국어** 전부 — UI 문자열·토스트·에러·빈 화면·푸시·이메일·랜딩 카피·챗봇 응답.
근거: 토스 UX 라이팅 8원칙·앱인토스 가이드, 당근 SEED 국제화 규칙, 배민·구름·모비인사이드 라이팅 가이드,
KatFish(ACL 2025) 구두점 연구, 아이보스 AI-vs-사람 카피 실험. 분담: 에이전트 **대화**의 한국어는 fluent-korean
output-style(코드 안 문자열은 그 도구의 적용 대상이 아님 — 이 절이 그 관례다), 300자+ **산문**의 AI 티는
im-not-ai가 맡고, 여기는 두 도구가 다루지 않는 **서비스 특화** 갭만 적는다.
(**훅 차단** = `check-ui-rules.sh` 검사 9가 src/·locales 편집 즉시 잡는다. 나머지는 자기비판 체크리스트.)

### 문체·경어 (가장 흔한 AI 티 — 화면마다 다른 어미)
- **문체는 CLAUDE.md의 문체 하나만** — 해요체 프로젝트에 "~습니다/~십시오/~시기 바랍니다"가 한 줄이라도 섞이면
  위반(**훅 차단**, 해요체 프로젝트만 — 합쇼체 프로젝트는 "좋아요" 같은 명사 때문에 기계 검사 없음, 체크리스트로).
  LLM은 프롬프트마다 어미를 새로 고르므로 새 화면을 만들 때 **기존 화면 문구를 먼저 Read**하고 따라 쓴다.
  - ❌ 홈 "오늘의 추천이에요" · 설정 "알림을 허용하시겠습니까?" · 완료 "저장되었습니다."
  - ✅ "오늘의 추천이에요" · "알림을 받을까요?" · "저장했어요"
- **높임은 문장 끝 한 번, 사물 존대 금지** — "~하실 수 있습니다", "~께서", "~시겠습니까" 금지(**훅 차단**).
  - ❌ "쿠폰을 사용하실 수 있습니다" ✅ "쿠폰을 쓸 수 있어요"
- **호칭** — "당신·여러분" 금지(**훅 차단**), "사용자님·고객님"은 합쇼체 프로젝트가 명시 채택한 경우만. 이름이 있으면
  `{name}님`, 없으면 호칭 생략. 토스식은 이름 호출 + 청유("~해볼까요?").

### 완료·에러·빈 화면 (영어 시스템 메시지 직역)
- **완료 문구는 능동·결과형** — "성공적으로"(**훅 차단**), "~되었습니다", "완료되었습니다" 금지.
  - ❌ "성공적으로 업로드되었습니다" ✅ "사진 3장을 올렸어요"
- **에러 = 원인 + 해결** — "문제가/오류가 발생했습니다" 단독 금지 (공용 fallback은 common.json `error.unknown` 하나만).
  - ❌ "오류가 발생했습니다. 다시 시도해 주세요." ✅ "이메일 형식이 아니에요. @를 포함해 입력해 주세요."
- **부정형 대신 조건형** — ❌ "잔액이 부족해 송금할 수 없습니다" ✅ "1,000원을 채우면 보낼 수 있어요"
- **빈 화면 = 상태 한 줄 + 다음 행동 한 줄** — "…이(가) 없습니다" 단독 금지.
  - ❌ "데이터가 없습니다" ✅ "아직 기록이 없어요" + [첫 기록 남기기]
- **사과·면책 상투구 금지** — "불편을 드려 죄송합니다", "소중한 의견 감사합니다", "도움이 되셨길 바랍니다"는 실제
  장애 공지 1회 외 금지. 챗봇 응답은 첫 문장이 답, 3문장 이내, 채팅 버블 안 마크다운 헤더·볼드·불릿 금지.

### 버튼·다이얼로그 (영어 CTA 문법 직역)
- **버튼은 명사형/~하기, 12자 이내, 느낌표·이모지 없음** — "누르면 생기는 일"을 쓴다. "확인·제출·OK·계속하려면 클릭"
  대신 동작. ❌ "지금 시작하세요!" ✅ "시작하기" · ❌ [확인] ✅ [삭제하기]
- **다이얼로그 버튼 쌍 고정** — 왼쪽(취소 측)은 항상 "닫기", 오른쪽은 동사+하기. "예/아니오"·"확인/취소" 혼용 금지.
  - ❌ "정말 삭제하시겠습니까? [예] [아니오]" ✅ "삭제할까요? 삭제하면 되돌릴 수 없어요 [닫기] [삭제하기]"
- **브랜드 고정 라벨 변형 금지** — 카카오 로그인은 "카카오로 시작하기"/"시작하기"만(카카오싱크 가이드). 소셜 로그인
  버튼 문구는 각 플랫폼 가이드를 먼저 확인.

### 변수·숫자·서식 (i18n 함정)
- **변수 뒤 조사 하드코딩 금지** — `{{name}}이`, `${count}을`은 받침에 따라 틀린다(**훅 차단**: `}` 바로 뒤 이/가/을/를/은/는/로).
  조사 없는 문장으로 바꾸거나 `{{name}}님이`처럼 받침이 고정된 명사를 붙인다.
  - ❌ "{{name}}이 가입했어요" ✅ "{{name}}님이 가입했어요"
- **복수 표시 금지** — 한국어는 수 구분이 없다. ❌ "3개의 항목(들)" ✅ "항목 3개"
- **숫자·날짜·통화는 한국식** — 큰 수는 만/억("12.3만"), 통화 "1,000원"(₩·$ 순서 금지), 기간 "3개월", 날짜는
  "9월 22일 (화) 오후 9:41" 또는 약식 "2026. 9. 22."(마지막 마침표까지). ISO `2026-09-22`·"123K"·"9월 22일, 2026" 금지.
  괄호 앞은 띄지 않는다. (당근 SEED 국제화 규칙)
- **한 줄 원칙** — 토스트·라벨·푸시 본문은 한 문장, 375px에서 한 줄(약 20자). 본문은 `word-break: keep-all`
  (tokens.css body 기본값 — 어절 중간 줄바꿈 방지), 제목은 `text-balance`.

### 알림·이메일·마케팅 (채널 규칙)
- **이모지·느낌표 상한** — UI 문자열 0개, 푸시·알림은 문장 끝에 최대 1개, 느낌표는 화면당 0~1개, 문장 중간 이모지 금지.
  - ❌ "🎉 축하합니다! 🎊 포인트가 적립되었습니다!! 지금 확인하세요! 🚀" ✅ "포인트 1,200원이 들어왔어요 🎉"
- **푸시는 이름 + 구체 숫자 + 1~2줄** — 범용 문장("새로운 소식이 있어요") 금지 (토스 푸시 원칙).
- **카카오 알림톡은 정보성만** — 미리보기 40자·강조 제목 50자, 인사·이모지·혜택 유도 금지 (심사 반려).
- **과장·최상급·강요형 금지** — "혁신적인"(**훅 차단**)·"최고의·완벽한·삶을 바꾸는·지금 바로!" 금지. 한국 시장은 절제된
  톤 + 구체 숫자가 전환이 높다(아이보스 실험: 사람 카피 클릭률 2~3배).
  - ❌ "혁신적인 경험을 지금 바로 만나보세요!" ✅ "가계부, 3초면 끝나요"
- **인사·마무리 상투구 금지** — "안녕하세요, 고객님. … 추가 질문이 있으시면 언제든지" 틀 대신 본론부터.

### 300자+ 산문 (랜딩·온보딩·이메일·공지·약관 안내)
- 작성 후 `/humanize-scan`(im-not-ai, 사용자 전역 설치 — setup-checklist T7)으로 AI 티 점검. 손볼 게
  많다고 나오면 `/humanize-korean`. 실측 판별력이 높은 신호 6개: "A가 아니라 B" 대구 반복 · 100자 넘는 문장 부재 ·
  연결어미 뒤 쉼표("-고,"·"-며,") · 문단 끝 당위("~해야 한다") 반복 · 같은 종결어미 4문장+ 연속 · "~적 N" 추상 체인.
  산문 작업 폴더 `_workspace/`는 .gitignore에 있음.
- 산문에서도 § 문체·경어와 § 알림·이메일·마케팅 규칙은 그대로 적용.

### 개발 산출물 (커밋·PR·docs)
- 커밋 제목은 개조식 명사형("로그인 실패 시 재시도 추가") — "~을 수행함/진행함", "~에 의해", "~되어지는" 금지. PR 본문은
  문제/변경/검증 구조, 사용자 관점 증상을 먼저("이름을 바꿔도 목록엔 옛 이름이 남던 문제").

---

## Firebase

### 모듈러 SDK (v12)
- **모듈러 API만** (`import { getDoc } from 'firebase/firestore'`) — compat·네임스페이스드 금지.
- 초기화는 `src/lib/firebase.ts` 단일 파일 — 앱 어디서도 initializeApp 재호출 금지.
- 안 쓰는 서비스(analytics·performance 등)는 import 자체를 하지 않는다 (트리셰이킹 무효화).
- dev 모드는 에뮬레이터 연결 분기 (`connectFirestoreEmulator` 등) — lib/firebase.ts에 내장.

### 보안규칙 대조 (연산 추가·변경 시마다)
Firestore/Storage 연산(`setDoc/updateDoc/addDoc/deleteDoc/getDoc(s)/query/uploadBytes` 등)을
**추가하거나 필드셋을 바꿀 때마다**, 해당 `match` 블록의 allow 조건과 정적 대조한다 — 배포 후
permission-denied를 기다리면 늦다. 대조 방법·함정(affectedKeys, list 스코프 등):
`knowledge/pitfalls.md` § "Security Rules 정적 대조". 코드와 규칙은 같은 커밋에서 함께 갱신.
규칙 테스트는 `@firebase/rules-unit-testing` + 에뮬레이터로 CI에 포함.

### 리스트 쿼리 (페이지네이션·비용)
- **limit + 커서(startAfter) 페이지네이션 필수** (기본 limit 20) — 전체 컬렉션 무제한 getDocs/
  onSnapshot 금지 (비용은 읽기 "횟수"가 좌우: unknown-unknowns #5).
- 실시간이 꼭 필요한 목록만 onSnapshot + limit, 나머지는 getDocs + useInfiniteQuery.
- 웹 오프라인 퍼시스턴스는 기본 꺼져 있음 — 필요 시 `persistentLocalCache` 명시 활성화 (멀티탭
  옵션 포함 여부 결정).

### CORS (같은 오리진으로 피하는 게 정석 — docs/CORS.md)
- **앱 → Cloud Function**: CORS를 "여는" 게 아니라 **피한다**. ① `onCall`(CORS 자동) 기본, 또는
  ② Hosting `/api/**` rewrite로 같은 오리진화(`fetch("/api/…")`). onRequest를 직접 열어야 하면
  v2 내장 `cors` 옵션(`onRequest({ cors: [...] }, …)`)만 — `cors` npm 패키지 금지.
- **앱 → Storage 파일 fetch/canvas**: 버킷 CORS 필요. `cors.json`을 `gcloud storage buckets update
  gs://<버킷> --cors-file=cors.json`로 적용. origin에 `*` 금지(실도메인만).
- **외부 서드파티 API는 브라우저 직접 호출 금지** — Cloud Function 프록시 경유 (CORS + 키 은닉).
- 로컬 dev는 Vite `server.proxy`로 `/api` 프록시. App Check 켜면 커스텀 헤더가 preflight를 유발하니
  onRequest는 반드시 cors 옵션 또는 Hosting rewrite. 상세·명령어: **docs/CORS.md**.

### 환경변수
- Firebase config(apiKey 등)는 시크릿 아님 — `VITE_FIREBASE_*`로 .env에 두고 커밋 가능. 보안은
  Security Rules + App Check가 담당.
- **진짜 시크릿(AI API 키·서버 키)은 절대 VITE_ 접두사 금지** — 번들에 평문 박제된다. 서버 작업은
  Cloud Functions 경유.

### 테스트 계정 (dev+에뮬레이터 전용 — 프로덕션 하드 차단)
- 테스트 로그인 로직은 `src/lib/test-auth.ts`가 **단일 소유**. 규약은 `docs/TEST_ACCOUNTS.md`.
  전화 `010########`(전체 범위)/인증번호 `123456`, 이메일 `@test.local`/고정 비번.
- **가드 완화 절대 금지**: `import.meta.env.DEV && VITE_USE_EMULATORS`를 둘 다 만족할 때만 활성 —
  프로덕션에서 통하면 계정 탈취 백도어다. 로그인 UI는 `isTestPhone`/`isTestEmail`로 분기(프로덕션에선
  항상 false).
- 테스트 계정 관련 새 로직을 컴포넌트·핸들러에 직접 심지 말고 test-auth.ts에만 둔다.

(그 외 승격된 규칙 없음. recent.md 3회 이상 반복 시 추가)

---

## 테스트

### 기본 원칙 (70/20/10)
- 단위(Vitest) 70 / 통합(RTL) 20 / E2E(Playwright) 10 비율 지향.
- RTL은 사용자 관점 쿼리(getByRole·getByLabelText) 우선 — testid는 최후 수단, 구현 세부(상태값·
  내부 함수) 테스트 금지.
- Firebase 의존 테스트는 에뮬레이터(`firebase emulators:exec`) 또는 api/ 모듈 모킹 — 실 프로젝트
  연결 금지.
- E2E는 비즈니스 크리티컬 경로만 (로그인·핵심 CRUD·결제류).
- **스모크 스펙 등록**: 새 라우트를 추가하면 `e2e/smoke.spec.ts`의 라우트 목록에도 등록 —
  "렌더는 되는데 아무것도 연결 안 된 UI"(Potemkin) 탐지용. Large 작업(새 feature·라우트)은
  검증 4종에 스모크를 5번째로 추가 실행.

(아직 승격된 규칙 없음)

---

## 빌드/배포

### 검증 명령어
1. npm run lint
2. npm run typecheck
3. npm run test
4. npm run build

모든 명령 통과해야 완료로 인정. (CI와 동일 목록 — CLAUDE.md와 정합)

### 성능 예산
- 초기 JS(gzip) 250KB 이하, 라우트 청크 100KB 이하 — 초과 시 스플리팅·의존성 재검토.
- Core Web Vitals 타깃(75퍼센타일): LCP < 2.5s / INP < 200ms / CLS < 0.1.
- 번들 분석: `npm run build -- --mode analyze` (rollup-plugin-visualizer) — 새 의존성 추가 전 크기
  확인 (bundlephobia).

### 배포 (Firebase Hosting)
- PR = preview channel 자동 배포 (CI), main 머지 = live 배포.
- SPA rewrite(`"destination": "/index.html"`) + 캐시 헤더(해시 에셋 max-age=31536000,
  index.html no-cache)는 firebase.json이 소유.
- 배포 전 firestore.rules 테스트 통과 필수. rules/functions 배포는 hosting과 별도 스텝.

### 커밋
- `<type>(<scope>): <설명>` (feat/fix/refactor/test/docs/style/perf)
- 한 커밋에 로직 OR 리팩터 OR 포맷 하나
- base: main

### 에스컬레이션
멈추는 곳의 목록은 **CLAUDE.md § 에스컬레이션 하나뿐**이다. 이 문서의 "에스컬레이션"은 모두 그 목록의 항목을 가리킨다.
목록에 없는 애매함은 가장 가까운 규칙 안의 방법으로 끝내고 완료 보고에 가정을 적는다.
