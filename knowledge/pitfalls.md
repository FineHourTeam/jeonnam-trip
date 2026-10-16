# 플랫폼 함정

React / Firebase(웹) / TanStack Query / React Router 등의 고질적 함정.
에이전트가 규칙을 지켜도 플랫폼 때문에 터지는 것만 기록.
**사람만 수정**.

## mistakes와의 차이
- mistakes/recent.md: **에이전트 실수** (규칙 위반)
- pitfalls.md: **플랫폼·프레임워크 특유의 함정** (에이전트 잘못 아님)

## 기록 기준
- 같은 문제를 다른 프로젝트에서도 겪을 만한 일반성이 있을 때
- React/브라우저 특유의 예상 못한 동작
- Firebase SDK의 알려지지 않은 제약
- 브라우저 간 차이 (Safari가 단골)
- TanStack Query/React Router 등 라이브러리의 엣지 케이스

## 포맷

### [카테고리] 함정 제목
- **증상**: 무슨 문제가 나타나는가
- **원인**: 왜 발생하는가 (플랫폼 레벨)
- **해결**: 어떻게 우회·해결하는가
- **첫 발견**: questions.md YYYY-MM-DD 요청 N

---

## React

### [React] AI가 구버전 React API·패턴을 환각으로 생성한다 (클래스 컴포넌트, 레거시 라이프사이클 등)
- **증상**: `componentDidMount`, `React.FC` 남발, `forwardRef`(19에서 불필요), defaultProps(함수
  컴포넌트에서 deprecated), react-helmet(19 네이티브 metadata로 대체), enzyme류 테스트 패턴 같은
  구세대 코드가 신규 코드에 섞여 들어온다. 린트 경고가 나거나, 미묘하게 요즘 관례와 어긋난다.
- **원인**: 학습 데이터에 과거 코드가 압도적으로 많아 모델이 구버전 패턴을 더 자주 생성하는 편향.
  "실수"라기보다 학습 데이터 시점 문제라 pitfalls.md 범주.
- **해결**: package.json의 정확한 react·라이브러리 버전을 먼저 확인하고 그 버전 기준으로 작성한다.
  아래 **알려진 대체 목록**을 기본 참고하고, 최신 API가 의심되면 코드 작성 전 WebFetch로 react.dev
  해당 페이지를 직접 확인한다.

  | 구버전(금지) | 대체 |
  |------|------|
  | 클래스 컴포넌트·라이프사이클 | 함수 컴포넌트 + 훅 |
  | `forwardRef` | ref를 일반 prop으로 (React 19) |
  | `defaultProps` (함수 컴포넌트) | 파라미터 기본값 |
  | react-helmet(-async) | 컴포넌트에서 `<title>`/`<meta>` 직접 렌더 (React 19 네이티브 호이스팅) |
  | `useEffect`+fetch 데이터 로딩 | TanStack Query |
  | PropTypes | TypeScript 타입 |
- **첫 발견**: (프로젝트 무관, 세션 리서치 기반 — fine-harness-react-kit 자체 pitfalls 시드)

### [React] Vite 생태계 전환기(Vite 8 Rolldown·ESLint 10·TS 6) — 구버전 전제 설정이 조용히 깨진다
- **증상**: 블로그·학습 데이터 기준(2024~25년)의 설정이 신규 스캐폴드에서 그대로 안 돌아간다.
  2026-07 파일럿 실측 4건: (1) `npm create vite` 템플릿의 lint가 ESLint가 아니라 **oxlint**로 생성됨.
  (2) `npm i -D eslint @eslint/js` 버전 미지정 설치가 **ESLint 10 피어 충돌**(ERESOLVE)로 실패.
  (3) TS 6에서 `baseUrl`이 **deprecated 에러**(TS5101). (4) Vite 8(Rolldown)에서
  `manualChunks` **객체형이 타입 에러** — 함수형만 허용.
- **원인**: 2025~26년에 빌드 체인이 세대 교체 중 — Vite 8=Rolldown/Oxc(`@vitejs/plugin-react` v6도
  Babel→Oxc), ESLint 10 출시, TS 6 deprecated 정리. 학습 데이터 대부분이 이전 세대 배선을 설명한다.
- **해결**: 이 스타터의 example 설정 파일들이 이미 보정돼 있다 — (1) lint 스크립트를 `eslint .`로
  교체, (2) ESLint 스택은 v9 라인 핀 고정(`eslint@^9` 등, bootstrap 의존성 블록 참조), (3) paths는
  baseUrl 없이 상대 경로, (4) manualChunks는 함수형. React Compiler 등 새 배선이 필요하면 코드 작성
  전 WebFetch로 vite.dev·react.dev 공식 문서를 확인한다.
- **첫 발견**: fine-harness-react-kit 파일럿 설치 2026-07-14 (리서치 시드 + 실측 확장)

## Firebase

### [Firebase] Storage read 규칙이 firestore.exists를 걸면 "파일 먼저 업로드"가 permission-denied
- **증상**: 새 문서를 만들며 파일을 첨부하는 흐름에서, 파일이 있을 때만 `permission-denied`가 난다.
  업로드(`uploadBytes`) 자체는 통과하는데 그 직후 `getDownloadURL()`에서 터지거나, 첨부 없는 제출은
  멀쩡하다.
- **원인**: `storage.rules`의 read 규칙이 흔히 부모 문서 소유권을 `firestore.exists(...)` +
  `firestore.get(...).userId == request.auth.uid`로 검증한다. 클라이언트가 **Firestore 문서를 만들기
  전에 Storage에 먼저 업로드하고 `getDownloadURL()`(=read)** 를 호출하면, 그 시점에 부모 문서가
  없어 read 규칙이 거부한다. `getDownloadURL`은 write가 아니라 **read** 권한이라는 점이 함정.
- **해결**: 순서를 **① Firestore 문서 먼저 생성(URL 필드는 빈 배열)** → ② Storage 업로드 →
  ③ `getDownloadURL` → ④ 문서에 URL 반영(update)으로 고정한다. Firestore update 규칙도 "URL
  필드가 현재 비어있을 때 1회만" 등으로 좁힌다. (동일 패턴을 모든 "문서+첨부" 생성 흐름에 일관 적용.)
- **첫 발견**: 실제 프로젝트 2026-07-08 (Flutter 프로젝트에서 검증 — 웹도 동일 규칙 체계)

### [Firebase] Security Rules는 실배포 없이 클라이언트 연산을 정적 대조하면 permission-denied를 사전에 잡는다
- **증상**: QA/배포에서야 특정 화면의 저장·목록이 `permission-denied`로 실패하는 걸 발견한다.
  규칙과 클라이언트가 따로 진화하면서 어긋난 것.
- **원인**: 규칙과 클라이언트 코드가 별개 파일이라, 클라이언트가 보내는 **필드셋/조건**과 규칙의
  `allow` 조건이 소리 없이 불일치하기 쉽다. 특히: (a) `update` 규칙의
  `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`는 **변경된 필드만**
  카운트한다 — 클라이언트가 목록 밖 필드를 하나라도 더 실으면 거부. (b) `create`가
  `status=='pending'` 등 특정 값을 강제하는데 모델이 다른 값/누락. (c) `list` 쿼리의
  `where/orderBy`가 per-doc `read` 스코프(예: `resource.data.userId == uid`)와 불일치하면 쿼리
  전체가 거부. (d) Storage read가 `firestore.exists`를 거는 시점 문제(위 항목). (e) 트랜잭션/배치는
  건드리는 **모든** 문서가 각자 규칙을 통과해야 함.
- **해결**: 배포를 기다리지 말고 **정적 대조 감사**를 한다 — api/에서 모든
  `setDoc/updateDoc/addDoc/deleteDoc/getDoc(s)/query`와 Storage `uploadBytes/getDownloadURL/
  deleteObject`를 grep으로 열거 → 각 연산의 (컬렉션/경로, 필드셋, 조건)을 확정 → 대응 `match`
  블록의 `allow`와 문법대로 대조(hasOnly·affectedKeys·`get('f', default)` 기본값 처리까지) →
  거부되는 연산을 찾아 규칙을 좁히거나 넓힌다. **업데이트 경로가 새로 생기거나 필드가 추가될
  때마다** 이 대조를 함께 한다(코드-규칙 동시 갱신). CI의 `@firebase/rules-unit-testing` 테스트로
  재확인.
- **첫 발견**: 실제 프로젝트 2026-07-08 (배치 변경 후 규칙 전수 대조)

## TanStack Query
(아직 기록된 함정 없음)

## React Router
(아직 기록된 함정 없음)

## 브라우저 (Safari 등)
(아직 기록된 함정 없음 — iOS Safari의 100vh·날짜 파싱·IndexedDB 이슈가 단골 후보)
