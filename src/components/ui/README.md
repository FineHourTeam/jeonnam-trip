# 공용 컴포넌트 카탈로그 (src/components/ui/)

UI를 만들기 전 **이 카탈로그를 먼저 확인**하고 있는 것을 재사용한다 (CLAUDE.md 절대 규칙).
여기 없는 공용 컴포넌트가 필요하면 feature 안에서 임시로 만들지 말고 **`npx shadcn@latest add <이름>`으로 바로 추가**
(승인 불필요)한 뒤 아래 표에 등록한다. shadcn 카탈로그에 없는 컴포넌트를 손으로 만들어야 할 때만 에스컬레이션.

## 설치 방식

shadcn/ui 패턴 — 라이브러리 설치가 아니라 **코드를 프로젝트에 복사**해 소유한다:
```bash
npx shadcn@latest add button dialog input card sonner
```
추가된 컴포넌트는 이 표에 등록한다 (등록 없는 컴포넌트 = 다음 작업자가 또 만든다).

## 표준 세트 (Button·AlertDialog·Sonner·Input은 bootstrap이 설치 시 추가, 나머지는 필요할 때 add)

| 컴포넌트 | 파일 | 용도 | 비고 |
|---------|------|------|------|
| Button | button.tsx | 모든 버튼 | variant(cva)가 스타일 소유 — 화면에서 색 재정의 금지 |
| Input / Textarea | input.tsx | 폼 입력 | react-hook-form과 조합 |
| Dialog / AlertDialog | dialog.tsx · alert-dialog.tsx | 모달·확인창 | window.confirm 대체 (훅이 직접 호출 차단). 삭제 확인은 AlertDialog |
| Card | card.tsx | 컨텐츠 컨테이너 | |
| Sonner(Toast) | sonner.tsx | 알림 토스트 | 알림 UI 자작 금지. `<Toaster />`는 App 최상단에 1개(bootstrap이 마운트), 호출은 `toast("…")` |
| Form | form.tsx | RHF + zod 배선 | FormField/FormMessage 포함 |
| Skeleton | skeleton.tsx | 로딩 상태 | 스피너보다 스켈레톤 우선 |

## 규칙

- 스타일 변형은 컴포넌트의 `variant`/`size` prop(cva)이 소유 — 새 변형이 필요하면 variant를 추가하고 보고한다
  (기존 variant의 모양을 바꾸는 것만 에스컬레이션), 화면에서 className 색 덮어쓰기 금지.
- 이 폴더에서 에이전트가 승인 없이 하는 일: `shadcn add` · 아이콘 import를 프로젝트 세트로 교체 · variant 추가 · 아래 표 등록.
  shadcn 원본 코드의 arbitrary value(`rounded-[4px]` 등)는 편집 훅 검사 대상에서 빠진다.
- 색·간격·라운드는 tokens.css 토큰만 (rules.md § 디자인).
- 아이콘은 `@/components/icons` 프로젝트 세트만 (lucide 등 기본 팩 금지 — `shadcn add`로 들어온 lucide import는 바로 교체). 아이콘 버튼은 `aria-label` 필수.
- 프로젝트 전용 조합 컴포넌트(예: PageHeader, EmptyState)는 `src/components/` (ui/ 밖)에 두고
  이 README 하단에 별도 표로 등록.

## 프로젝트 컴포넌트 (ui/ 밖 — 추가 시 여기 등록)

| 컴포넌트 | 파일 | 용도 |
|---------|------|------|
| (아직 없음) | | |
