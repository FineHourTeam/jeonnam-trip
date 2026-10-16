# CORS 설정 가이드

> React+Firebase 웹앱에서 CORS가 막히는 4곳과 각 해법의 **단일 출처**. 원칙: **가능하면 CORS를
> 마주치지 않게 설계**(같은 오리진)하고, 불가피한 Storage 다운로드만 버킷 CORS로 연다.

## 어디서 CORS가 나오나 — 결정 트리

| 상황 | 오리진 | 해법 |
|------|--------|------|
| SPA가 자기 정적 파일 로드 | 같은 오리진 | CORS 없음 |
| SPA → Cloud Function 호출 | 다름(cloudfunctions.net) | **① onCall(자동) 또는 ② Hosting `/api` rewrite(같은 오리진화)** — 아래 2·3 |
| SPA → Storage 파일 `fetch`/canvas | 다름(firebasestorage.app) | **③ 버킷 CORS(cors.json)** — 아래 1 |
| SPA → 외부 서드파티 API | 다름 | 브라우저 직접 호출 금지 → **Cloud Function 프록시** 경유 |
| 로컬 dev에서 위 호출 | localhost | **④ Vite dev proxy** — 아래 4 |

**핵심**: 앱↔Functions는 CORS를 "여는" 게 아니라 **같은 오리진으로 만들어 피하는** 게 정석
(Hosting rewrite). Storage 다운로드만 진짜로 버킷 CORS가 필요하다.

---

## 1. Firebase Storage 버킷 CORS

`getDownloadURL()` 결과를 `<img src>`로 쓰는 것만이면 대개 불필요하지만, **`fetch()`로 받거나
`<img crossorigin>`/canvas로 읽으면** 버킷 CORS가 필요하다. 설정은 `templates/firebase/cors.json`
(이 프로젝트 루트에 복사됨)을 버킷에 적용:

```bash
# 현재 권장 (gcloud storage) — 버킷명은 프로젝트 실제 값 (신규=PROJECT.firebasestorage.app, 레거시=PROJECT.appspot.com)
gcloud storage buckets update gs://[PROJECT_ID].firebasestorage.app --cors-file=cors.json

# 레거시 등가 (gsutil — 여전히 동작하나 gcloud storage가 권장)
gsutil cors set cors.json gs://[PROJECT_ID].firebasestorage.app
```

- **버킷명**: `.env`의 `VITE_FIREBASE_STORAGE_BUCKET` 값 그대로 (하드코딩 접미사 금지 — 2024-10부터
  신규 프로젝트는 `firebasestorage.app`, 레거시는 `appspot.com`).
- **cors.json은 최상위 배열**(`{"cors":[...]}` 래퍼 없음) — gcloud/gsutil CLI 공통.
- **origin에 `*` 금지**(프로덕션) — 아무 사이트나 우리 스토리지를 읽게 된다. 실제 도메인(localhost dev +
  web.app + 커스텀 도메인)만 나열. cors.json의 `[PROJECT_ID]`·`[PRODUCTION_DOMAIN]`을 실값으로 치환.
- 적용 후 브라우저 캐시(`maxAgeSeconds`) 때문에 반영이 늦을 수 있음 — 하드리로드로 확인.

---

## 2. Cloud Functions CORS (firebase-functions v2)

- **Callable(`onCall`)은 CORS 자동 처리** — 브라우저 SDK(`httpsCallable`)가 관리. **앱→함수 호출은
  가능하면 onCall을 기본으로** 쓴다 (CORS 작업 0).
- **HTTP(`onRequest`)는 v2 내장 `cors` 옵션** 사용 — `cors` npm 패키지 불필요:
  ```js
  const { onRequest } = require("firebase-functions/v2/https");
  // 전체 허용
  exports.api = onRequest({ cors: true }, (req, res) => { res.send("ok"); });
  // 특정 오리진만 (문자열/정규식 배열)
  exports.api = onRequest({ cors: ["https://[PROJECT_ID].web.app", /\.[도메인]$/] }, handler);
  ```
  `cors` 없으면 헤더가 안 붙어 브라우저 호출이 차단된다. preflight(OPTIONS)도 이 옵션이 자동 처리.

---

## 3. Hosting rewrite로 CORS 회피 (권장 기본 패턴)

SPA가 **같은 오리진 경로(`/api/**`)** 를 호출하면 Hosting이 함수로 프록시 → **CORS 자체가 없음**.
`firebase.json` (templates/firebase/firebase.json.example 참조):

```json
"rewrites": [
  { "source": "/api/**", "function": { "functionId": "api", "region": "asia-northeast3", "pinTag": true } },
  { "source": "**", "destination": "/index.html" }
]
```
- v2 함수는 **객체 형식**(`functionId`+`region`) 사용. `region`은 함수 배포 리전과 일치시켜 명시.
- `/api/**` rewrite를 **SPA catch-all(`**`)보다 먼저** 둔다 (순서 중요).
- 앱에서는 `fetch("/api/…")`로 호출 → 오리진이 같아 CORS·preflight 없음. **함수를 쓰면 이 방식이 1순위.**

---

## 4. Vite dev proxy (로컬 개발)

로컬에서 `/api` 호출을 에뮬레이터 함수로 프록시해 dev에서도 CORS를 피한다. `vite.config.ts`:

```ts
server: {
  proxy: {
    "/api": {
      target: "http://127.0.0.1:5001/[PROJECT_ID]/asia-northeast3",
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, ""),
    },
  },
},
```
`target`을 에뮬레이터 함수 엔드포인트로, `rewrite`로 `/api` 접두사를 제거해 최종 경로가 함수에 닿게 한다.

---

## App Check + CORS (App Check 켤 때)

App Check 토큰은 커스텀 헤더 `X-Firebase-AppCheck`로 전송되고, **커스텀 헤더는 브라우저 preflight를
유발**한다. callable은 자동 처리되지만, **onRequest는 위 `cors` 옵션(또는 Hosting rewrite로 같은
오리진)** 이어야 preflight를 통과한다. App Check 시행(enforcement)과 CORS는 별개라 둘 다 설정 필요.

## 참고 (2026)
- gsutil → **gcloud storage**가 현재 GCS 권장 (Firebase 문서는 아직 gsutil 표기 — 뒤처진 것).
- 기본 버킷 접미사 `firebasestorage.app`(2024-10~), 신규 기본 버킷은 Blaze 필요.
- Functions 2세대 = "Cloud Run functions" 개명, `cloudfunctions.net`·`run.app` URL 둘 다 발급(동일 동작).
  Hosting rewrite를 쓰면 어느 URL에도 의존하지 않아 가장 견고.
