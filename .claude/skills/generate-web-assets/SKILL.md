---
name: generate-web-assets
description: 로고 원본으로 파비콘 세트·PWA 아이콘·OG 이미지 등 웹 서비스에 필요한 전 에셋을 생성하고 index.html 메타에 연결한다.
argument-hint: (인자 없음)
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob
---

# 웹 에셋 생성 (파비콘 · PWA 아이콘 · OG 이미지)

> 앱스토어가 없는 대신, 웹은 **파비콘·PWA 아이콘·소셜 공유(OG) 이미지**가 스토어 에셋에 해당한다.
> 로고 원본을 `web-assets/logo-source/`에 넣어두면 필요한 전 해상도를 미리 생성해 둔다.
> 사람이 필요할 때 직접 실행하는 스킬이며, **배포 전 검사(`scripts/check-web-assets.mjs`)가 실패하면 에이전트가
> 이 스킬을 실행한다** — 호스팅 배포 훅이 파비콘·OG 누락을 막고 여기로 보낸다.

## 사전 조건

```bash
magick -version || convert -version   # ImageMagick (아이콘 리사이즈)
npx playwright --version              # OG 이미지 HTML 렌더링 (없으면 npx playwright install chromium 안내)
```
- 로고 원본: `web-assets/logo-source/logo.png` (1024×1024 이상 권장) 또는 `logo.svg`
- 없으면 사용자에게 배치 요청 후 대기. (에이전트가 로고 시안을 생성하는 것도 가능 — 사용자 선택)

## Step 1: 파비콘 + PWA 아이콘 생성

`web-assets/generated/` 와 `public/`에 아래 세트 생성:

| 파일 | 크기 | 용도 |
|------|------|------|
| public/favicon.ico | 16+32+48 멀티 | 레거시 브라우저 탭 |
| public/favicon.svg | 벡터 | 모던 브라우저 (다크모드 대응 가능) |
| public/apple-touch-icon.png | 180×180 | iOS 홈 화면 |
| public/icons/icon-192.png | 192×192 | PWA manifest |
| public/icons/icon-512.png | 512×512 | PWA manifest |
| public/icons/icon-maskable-512.png | 512×512 (안전영역 80%) | Android maskable |

```bash
magick web-assets/logo-source/logo.png -resize 180x180 public/apple-touch-icon.png
magick web-assets/logo-source/logo.png -resize 192x192 public/icons/icon-192.png
magick web-assets/logo-source/logo.png -resize 512x512 public/icons/icon-512.png
# maskable: 로고를 80%로 축소하고 배경색(브랜드색) 패딩
magick web-assets/logo-source/logo.png -resize 410x410 -background "<브랜드 배경색>" \
  -gravity center -extent 512x512 public/icons/icon-maskable-512.png
magick web-assets/logo-source/logo.png -define icon:auto-resize=48,32,16 public/favicon.ico
```
브랜드 배경색은 `src/styles/tokens.css`의 `--primary`(또는 `--background`) 값을 읽어 사용.

## Step 2: manifest.webmanifest 생성/갱신

`public/manifest.webmanifest`:
```json
{
  "name": "<제품명>",
  "short_name": "<짧은 이름>",
  "start_url": "/",
  "display": "standalone",
  "background_color": "<tokens.css --background>",
  "theme_color": "<tokens.css --primary>",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Step 3: OG 이미지 생성 (1200×630)

`web-assets/og-template/og.html`(HTML/CSS 템플릿 — 로고+제품명+한 줄 소개+브랜드 배경)을
Playwright로 1200×630 스크린샷:

```bash
npx playwright screenshot --viewport-size=1200,630 web-assets/og-template/og.html public/og-image.png
```

문구는 `web-assets/og.json`(제품명·태그라인)에서 읽는다 — 없으면 사용자에게 문구 확인 후 생성.
템플릿의 색·폰트는 tokens.css 토큰과 일치시킨다.

## Step 4: index.html 메타 연결

`index.html` head에 아래가 모두 있는지 확인하고 없으면 추가 (기존 값은 덮어쓰기 전 확인):

```html
<!-- 순서 유지: ICO/PNG를 SVG보다 먼저. Google 검색 결과 아이콘은 SVG를 지원하지 않고 48px보다 큰 ICO/PNG를 권장 -->
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="<브랜드색>">
<meta property="og:title" content="<제품명>">
<meta property="og:description" content="<한 줄 소개>">
<meta property="og:image" content="<프로덕션 도메인>/og-image.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```
og:image는 **절대 URL**이어야 카카오톡·슬랙 미리보기가 동작한다 — 프로덕션 도메인 확정 전이면
`docs/setup-checklist.md`의 **W5**(og:image 절대 URL)를 미완료로 둔다.

## Step 5: 검증 + 완료 보고

- `npm run check:web-assets` 통과 필수 (배포 훅·배포 CI와 같은 검사 — 실패 항목이 남으면 Step 1~4로 돌아간다)
- `npm run build && npm run preview`로 파비콘·manifest 로드 확인 (콘솔 404 없음)
- 이미 배포된 사이트라면 재배포 후 `node scripts/check-web-assets.mjs --url https://<도메인>`으로 Googlebot 기준 확인,
  Search Console URL 검사에서 홈페이지 **색인 생성 요청** (Google 검색 결과 아이콘 반영까지 며칠~몇 주)
- 생성 파일 목록 + 남은 수동 항목(카카오톡 미리보기 캐시는 https://developers.kakao.com/tool/debugger/sharing 에서 갱신) 보고
- `docs/setup-checklist.md` § 6 웹 에셋(W1~W3) 체크 안내
