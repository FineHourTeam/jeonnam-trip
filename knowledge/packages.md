# 컴포넌트·패키지 리치포(reach-for) 맵

> "이 기능엔 어떤 패키지/컴포넌트를 쓸까?"의 **단일 출처**. UI·기능을 만들기 전 이 파일을 보고
> **검증된 것을 조합**한다 — 손수 재구현 금지(접근성·엣지케이스·유지보수·보안이 숨은 비용).
> 정책은 rules.md § 컴포넌트·패키지 우선. **사람만 수정.**

## 핵심 원칙 3줄
1. **shadcn 카탈로그에 있으면** `npx shadcn@latest add <이름>`으로 가져와 조합 — 새 패키지 금지.
2. **스택에 있으면** 그걸 쓴다 (아래 "스택 확정" 표) — 대체 라이브러리 추가 금지.
3. **10~30줄 유틸이면** 직접 작성 + 유닛테스트. 그 외 새 런타임 의존성은 검증표 + 에스컬레이션.

## 스택 확정 — 대체 라이브러리 추가 금지
| 니즈 | 표준 | 금지 대체 |
|------|------|----------|
| 서버상태·캐싱·페칭·무한스크롤 | TanStack Query (`useInfiniteQuery`) | SWR·Apollo·ad-hoc fetch |
| 클라이언트 전역상태 | Zustand | Redux·Recoil·Jotai·MobX |
| 폼 상태·검증 | react-hook-form + zod | Formik·yup·직접 useState 폼 |
| 라우팅 | React Router v7 | (TanStack Router는 에스컬레이션) |
| 애니메이션 | **`motion`** (`import { motion } from "motion/react"`) | react-spring·GSAP·자체 |
| 아이콘 | **프로젝트 SVG 세트** (`@/components/icons`, 컨셉에 맞게 새로 그림) | lucide-react·react-icons 등 모든 기본 아이콘 팩 |
| className | `cn()` = clsx + tailwind-merge | 문자열 수동 조합 |
| 날짜 | date-fns (+ @date-fns/tz) | moment(EOL)·luxon·dayjs 혼용 |
| 차트 | recharts (shadcn Chart) | 즉흥 선택 |
| 숫자·통화·날짜 포맷 | `Intl.NumberFormat`/`Intl.DateTimeFormat` 네이티브 | 수동 포맷 |

## 리치포 맵 — shadcn 경유로 "무료" 획득 (표준 채택)
아래는 대부분 shadcn 컴포넌트의 내부 기반이라 `shadcn add`만 하면 딸려온다. 직접 install·재구현 금지.
**이 표의 `shadcn add`는 승인 없이 바로 실행한다** (딸려오는 런타임 의존성 포함 — 채택 정책 게이트 4 면제).

| 니즈 | shadcn 컴포넌트 (기반 패키지) |
|------|------------------------------|
| Select·Combobox·멀티셀렉트 | `shadcn add combobox` (cmdk + Popover) |
| Command 팔레트(⌘K) | `shadcn add command` (cmdk) |
| 토스트·알림 | `shadcn add sonner` (sonner — `aria-live` 내장) |
| 캐러셀 | `shadcn add carousel` (embla-carousel-react) |
| 차트 | `shadcn add chart` (recharts) |
| 데이터 테이블(정렬·필터·페이지) | `shadcn add table` + TanStack Table |
| 날짜 선택 | `shadcn add calendar popover` → 날짜 선택기는 두 컴포넌트를 조합 (react-day-picker + date-fns — date-picker는 레지스트리 항목이 아니라 조합 예제) |
| Drawer(모바일 시트) | `shadcn add drawer` (vaul) |
| OTP 입력(6칸) | `shadcn add input-otp` (input-otp — 붙여넣기·자동이동) |
| 모달·시트·팝오버·툴팁·드롭다운 | `shadcn add dialog/sheet/popover/tooltip/dropdown-menu` (Radix — focus trap·scroll lock·collision 무료) |
| 스켈레톤·스피너 | `shadcn add skeleton` / `spinner` |
| variant 관리 | cva (class-variance-authority) — shadcn 동반 |

## 리치포 맵 — 필요할 때만 추가 (에스컬레이션 대상)
런타임 의존성 신규 추가라 rules.md § 채택 정책 게이트 4(사람 승인) 통과 필요. 대형은 라우트 lazy load.

| 니즈 | 패키지 | 비고 |
|------|--------|------|
| 가상화(1만+ 행/그리드) | `@tanstack/react-virtual` | 가변 높이·오버스캔, tiny |
| 드래그앤드롭 | `@dnd-kit/core` (+ `/sortable`) | react-beautiful-dnd(EOL) 대체 |
| 파일 업로드·드롭존 | `react-dropzone` | TS 내장 |
| 리치텍스트 에디터 | `@tiptap/react` (ProseMirror) | **대형 — 라우트 lazy load 필수** |
| 마크다운 렌더 | `react-markdown` + `remark-gfm` | `dangerouslySetInnerHTML` 없이 안전 |
| ↳ 신뢰 못하는 raw HTML 포함 시 | + `dompurify` | rehype-raw 쓰면 반드시 sanitize |
| 전화번호 포맷·검증 | `libphonenumber-js` | 국가별 검증 (정규식 금지) |
| 판별 유니언 exhaustive 처리 | `ts-pattern` (선택) | switch 남발 대체 |
| PDF 생성/뷰 | `@react-pdf/renderer` / `react-pdf` | **대형 — lazy load** |
| QR 코드 | `qrcode.react` | 경량 |
| 이미지 크롭 | `react-easy-crop` | 터치·줌·회전 |
| 지도 | `@vis.gl/react-google-maps` / `react-leaflet` | **대형 — lazy load** |

## shadcn/ui 카탈로그 (2026) — 여기 있는 건 손수 만들지 말 것
`npx shadcn@latest add <이름>`. 기반: **Radix 프리미티브**(우리는 안정성 위해 `shadcn init -b radix`
유지) + cva + tailwind-merge + tw-animate-css.

- **입력/폼**: Input · Input Group · Input OTP · Textarea · Label · Field · Checkbox · Radio Group ·
  Switch · Select · Combobox · Slider · Toggle · Toggle Group · Calendar · Date Picker · Button · Button Group
- **오버레이/디스클로저**: Dialog · Alert Dialog · Sheet · Drawer · Popover · Hover Card · Tooltip ·
  Dropdown Menu · Context Menu · Menubar · Navigation Menu · Command · Collapsible · Accordion
- **레이아웃**: Card · Separator · Aspect Ratio · Scroll Area · Resizable · Sidebar · Tabs
- **데이터 표시**: Table · Data Table · Chart · Badge · Avatar · Progress · Skeleton · Spinner ·
  Carousel · Pagination · Breadcrumb · Kbd · Typography
- **피드백**: Alert · Sonner(toast) · Progress · Skeleton

## 안티패턴 — 자주 손수 만들지만 하면 안 되는 것
| ❌ 손수 재구현 | ✅ 대신 |
|------|------|
| ARIA 없는 div 드롭다운/셀렉트 | shadcn Select/Combobox |
| focus trap·scroll lock 없는 모달 | shadcn Dialog/Sheet |
| `new Date(str)` 파싱·수동 포맷 | date-fns / Intl |
| 자체 가상 스크롤 | @tanstack/react-virtual |
| setTimeout 토스트 큐 | sonner |
| useState 폼 상태·검증 | react-hook-form + zod |
| useEffect + fetch 페칭·캐싱 | TanStack Query |
| 자체 캐러셀(스와이프·스냅) | embla (shadcn Carousel) |
| HTML5 draggable 손수 D&D | @dnd-kit |
| dangerouslySetInnerHTML 마크다운 | react-markdown (+dompurify) |
| OTP 6칸 input 배열 | input-otp |
| 정규식 전화 검증 | libphonenumber-js |
| 자체 데이터 테이블 | @tanstack/react-table |

**판별 규칙**: "이거 접근성·엣지케이스 있나?"를 물어야 하는 위젯이면 → 십중팔구 shadcn/표준 패키지가 이미 있다.

---
## 참고 (2026-07 조사)
- shadcn 기본 프리미티브가 Base UI로 전환됨(2026-07). **Radix는 deprecated 아님·유지보수됨** — 우리는
  안정 우선으로 Radix 유지(`shadcn init -b radix`), Base UI는 향후 선택지.
- Radix가 단일 `radix-ui` 패키지로 통합됨(named import).
- Framer Motion → `motion`으로 개명(`motion/react`). `framer-motion`도 re-export로 동작하나 신규는 `motion`.
- 버전은 채택 시점 npm `latest`로 재확인 (이 문서는 이름·용도의 출처, 버전은 참고).
